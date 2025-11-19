import Stripe from 'stripe';
import { config } from '../config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false }
});

// Initialize Stripe client
let stripe: Stripe | null = null;
if (config.stripeSecretKey) {
  stripe = new Stripe(config.stripeSecretKey, {
    apiVersion: '2024-12-18.acacia' as any,
  });
}

export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired';
export type PlanType = 'free' | 'premium';

export interface SubscriptionData {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: SubscriptionStatus;
  planType: PlanType;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Create a Stripe customer for a user
 */
export async function createCustomer(userId: string, email: string): Promise<string> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  // Update subscription record with customer ID
  await supabase
    .from('subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('user_id', userId);

  return customer.id;
}

/**
 * Create a subscription with 7-day free trial
 */
export async function createSubscription(
  customerId: string,
  userId: string,
  trialDays: number = 7
): Promise<Stripe.Subscription> {
  if (!stripe || !config.subscriptionPriceId) {
    throw new Error('Stripe or subscription price ID is not configured');
  }

  const trialEnd = Math.floor(Date.now() / 1000) + (trialDays * 24 * 60 * 60);

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: config.subscriptionPriceId }],
    trial_end: trialEnd,
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });

  // Update subscription record
  await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status: 'trial',
      plan_type: 'premium',
      trial_ends_at: new Date(trialEnd * 1000).toISOString(),
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: false,
    })
    .eq('user_id', userId);

  return subscription;
}

/**
 * Cancel a subscription (at period end)
 */
export async function cancelSubscription(subscriptionId: string, userId: string): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: true })
    .eq('user_id', userId)
    .eq('stripe_subscription_id', subscriptionId);
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(subscriptionId: string, userId: string): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  await supabase
    .from('subscriptions')
    .update({ cancel_at_period_end: false })
    .eq('user_id', userId)
    .eq('stripe_subscription_id', subscriptionId);
}

/**
 * Get subscription details from Stripe
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    return null;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving subscription:', error);
    return null;
  }
}

/**
 * Get user's subscription from database
 */
export async function getUserSubscription(userId: string): Promise<SubscriptionData | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    status: data.status,
    planType: data.plan_type,
    trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
    currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : null,
    currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
    cancelAtPeriodEnd: data.cancel_at_period_end,
  };
}

/**
 * Create billing portal session URL
 */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Handle Stripe webhook events
 */
export async function handleWebhook(event: Stripe.Event): Promise<void> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscriptionFromStripe(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const sub = await getSubscription(invoice.subscription as string);
        if (sub) {
          await syncSubscriptionFromStripe(sub);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        const { data } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', invoice.subscription)
          .single();

        if (data) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('user_id', data.user_id);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}

/**
 * Sync subscription data from Stripe to database
 */
async function syncSubscriptionFromStripe(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!subData) {
    console.error('Subscription not found for customer:', customerId);
    return;
  }

  const statusMap: Record<string, SubscriptionStatus> = {
    'trialing': 'trial',
    'active': 'active',
    'canceled': 'canceled',
    'past_due': 'past_due',
    'incomplete': 'incomplete',
    'incomplete_expired': 'incomplete_expired',
  };

  await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status: statusMap[subscription.status] || 'active',
      plan_type: subscription.status === 'active' || subscription.status === 'trialing' ? 'premium' : 'free',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
    })
    .eq('user_id', subData.user_id);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer.id;

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (subData) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        plan_type: 'free',
        stripe_subscription_id: null,
        cancel_at_period_end: false,
      })
      .eq('user_id', subData.user_id);
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  if (!stripe || !config.stripeWebhookSecret) {
    console.warn('Stripe webhook verification skipped: Stripe not configured');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripeWebhookSecret
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}


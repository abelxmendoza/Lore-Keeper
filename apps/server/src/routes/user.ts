import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../services/supabaseClient';
import { logger } from '../logger';

const router = Router();

const acceptTermsSchema = z.object({
  acceptedAt: z.string().datetime(),
  version: z.string().default('1.0')
});

// Check if user has accepted terms
router.get('/terms-status', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const version = '1.0'; // Current terms version

    const { data, error } = await supabaseAdmin
      .from('terms_acceptance')
      .select('*')
      .eq('user_id', userId)
      .eq('version', version)
      .single();

    if (error) {
      // PGRST116 is "not found" - this is fine, user hasn't accepted yet
      if (error.code === 'PGRST116') {
        return res.json({
          accepted: false,
          acceptedAt: null,
          version: version
        });
      }

      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        logger.warn({ error }, 'terms_acceptance table does not exist. Returning not accepted.');
        return res.json({
          accepted: false,
          acceptedAt: null,
          version: version
        });
      }

      logger.error({ error, errorCode: error.code, errorMessage: error.message }, 'Failed to check terms status');
      return res.status(500).json({ error: 'Failed to check terms status', message: error.message });
    }

    res.json({
      accepted: !!data,
      acceptedAt: data?.accepted_at || null,
      version: data?.version || version
    });
  } catch (error) {
    logger.error({ error }, 'Error checking terms status');
    res.status(500).json({ error: 'Failed to check terms status' });
  }
});

// Accept terms of service
router.post('/accept-terms', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = acceptTermsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const userId = req.user!.id;
    const { acceptedAt, version } = parsed.data;

    // Get IP address and user agent for audit trail
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // In dev mode, ensure the dev user exists in auth.users
    // The foreign key constraint requires the user to exist in auth.users
    if (userId === '00000000-0000-0000-0000-000000000000') {
      try {
        // Try to get the user first
        const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (getUserError || !existingUser) {
          // Dev user doesn't exist, create it
          logger.info({ userId }, 'Creating dev user for terms acceptance');
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            id: userId,
            email: 'dev@example.com',
            email_confirm: true,
            user_metadata: { dev_mode: true }
          });
          
          if (createError) {
            logger.warn({ error: createError }, 'Failed to create dev user, may need to run create-dev-user.sql');
            // Continue anyway - the insert will fail with a clearer error
          } else {
            logger.info({ userId }, 'Dev user created successfully');
          }
        }
      } catch (error) {
        logger.warn({ error }, 'Error checking/creating dev user');
      }
    }

    const { data, error } = await supabaseAdmin
      .from('terms_acceptance')
      .insert({
        user_id: userId,
        version,
        accepted_at: acceptedAt,
        ip_address: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
        user_agent: userAgent,
        metadata: {
          source: 'web',
          timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        logger.error({ error, userId }, 'terms_acceptance table does not exist. Please run migration: migrations/20250120_terms_acceptance.sql');
        return res.status(500).json({ 
          error: 'Database table not found',
          message: 'The terms_acceptance table does not exist. Please run the database migration: migrations/20250120_terms_acceptance.sql'
        });
      }

      // Check if it's a duplicate (user already accepted)
      if (error.code === '23505') { // Unique violation
        logger.info({ userId, version }, 'User already accepted terms');
        return res.json({
          success: true,
          message: 'Terms already accepted',
          acceptedAt: acceptedAt
        });
      }

      // Check for foreign key constraint violation (dev user doesn't exist)
      if (error.code === '23503') {
        logger.error({ error, userId }, 'Foreign key constraint violation - dev user does not exist in auth.users');
        return res.status(500).json({ 
          error: 'Dev user not found',
          message: 'The dev user does not exist in auth.users. Please run this SQL in Supabase SQL Editor:\n\n' +
                   'See: scripts/create-dev-user.sql\n\n' +
                   'Or go to: https://supabase.com/dashboard/project/jawzxiiwfagliloxnnkc/sql/new',
          code: error.code,
          hint: 'Run the SQL from scripts/create-dev-user.sql to create the dev user'
        });
      }

      logger.error({ error, userId, version, errorCode: error.code, errorMessage: error.message }, 'Failed to accept terms');
      return res.status(500).json({ 
        error: 'Failed to accept terms',
        message: error.message || 'Database error occurred',
        code: error.code
      });
    }

    logger.info({ userId, version, acceptedAt }, 'User accepted terms of service');

    res.json({
      success: true,
      message: 'Terms accepted successfully',
      acceptedAt: data.accepted_at,
      version: data.version
    });
  } catch (error) {
    logger.error({ error }, 'Error accepting terms');
    res.status(500).json({ error: 'Failed to accept terms' });
  }
});

export const userRouter = router;


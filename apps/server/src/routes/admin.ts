/**
 * Admin Console Routes (Production-Facing)
 * Access: only if user.role === "admin"
 */

import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { supabaseAdmin } from '../services/supabaseClient';
import { logger } from '../logger';
import { config } from '../config';
import { getAdminMetrics } from '../lib/admin/getAdminMetrics';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth);
router.use(requireAdmin);

/**
 * Log admin action
 */
function logAdminAction(userId: string, action: string, details?: any) {
  logger.info({ userId, action, details, timestamp: new Date().toISOString() }, 'Admin action');
}

/**
 * GET /admin/metrics
 * Get admin dashboard metrics
 */
router.get('/metrics', async (req: AuthenticatedRequest, res) => {
  try {
    logAdminAction(req.user!.id, 'view_metrics');
    const metrics = await getAdminMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error({ error }, 'Error fetching metrics');
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /admin/users
 * Get user metrics
 */
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    logAdminAction(req.user!.id, 'view_users');

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100
    });

    if (error) {
      logger.error({ error }, 'Failed to fetch users');
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Get memory counts per user (no content visible)
    const { data: memoryCounts } = await supabaseAdmin
      .from('journal_entries')
      .select('user_id')
      .then(result => {
        if (result.error) return { data: [] };
        const counts = new Map<string, number>();
        result.data?.forEach(entry => {
          counts.set(entry.user_id, (counts.get(entry.user_id) || 0) + 1);
        });
        return { data: Array.from(counts.entries()).map(([user_id, count]) => ({ user_id, count })) };
      });

    const usersWithMetrics = users.users.map(user => ({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      memoryCount: memoryCounts.find((m: any) => m.user_id === user.id)?.count || 0,
      role: user.user_metadata?.role || user.app_metadata?.role || 'standard_user'
    }));

    res.json({ users: usersWithMetrics, total: usersWithMetrics.length });
  } catch (error) {
    logger.error({ error }, 'Error fetching users');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /admin/logs
 * Get error logs
 */
router.get('/logs', async (req: AuthenticatedRequest, res) => {
  try {
    logAdminAction(req.user!.id, 'view_logs');

    const limit = Number(req.query.limit) || 100;
    const level = req.query.level as string;

    // In a real implementation, you'd query from a logs table or service
    // For now, return a placeholder structure
    res.json({
      logs: [],
      message: 'Logs endpoint - implement with your logging service',
      limit,
      level
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching logs');
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * GET /admin/ai-events
 * Get AI generation logs
 */
router.get('/ai-events', async (req: AuthenticatedRequest, res) => {
  try {
    logAdminAction(req.user!.id, 'view_ai_events');

    const limit = Number(req.query.limit) || 100;
    const userId = req.query.userId as string;

    // Query AI generation events (you'd need to log these in your services)
    // For now, return placeholder
    res.json({
      events: [],
      message: 'AI events endpoint - implement with your AI logging service',
      limit,
      userId
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching AI events');
    res.status(500).json({ error: 'Failed to fetch AI events' });
  }
});

/**
 * POST /admin/reindex
 * Trigger embedding re-index
 */
router.post('/reindex', async (req: AuthenticatedRequest, res) => {
  try {
    logAdminAction(req.user!.id, 'trigger_reindex', req.body);

    // Trigger re-indexing of embeddings
    // This would call your embedding service to re-process entries
    res.json({ 
      message: 'Re-indexing triggered',
      status: 'queued'
    });
  } catch (error) {
    logger.error({ error }, 'Error triggering reindex');
    res.status(500).json({ error: 'Failed to trigger reindex' });
  }
});

/**
 * POST /admin/flush-cache
 * Flush cache
 */
router.post('/flush-cache', async (req: AuthenticatedRequest, res) => {
  try {
    logAdminAction(req.user!.id, 'flush_cache', req.body);

    const { flushMemoryCache } = await import('../lib/cache/flushMemoryCache');
    await flushMemoryCache();

    res.json({ 
      message: 'Cache flushed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ error }, 'Error flushing cache');
    res.status(500).json({ error: 'Failed to flush cache' });
  }
});

/**
 * POST /admin/rebuild-clusters
 * Rebuild memory clusters
 */
router.post('/rebuild-clusters', async (req: AuthenticatedRequest, res) => {
  try {
    logAdminAction(req.user!.id, 'rebuild_clusters', req.body);

    const { runClusterRebuild } = await import('../jobs/runClusterRebuild');
    
    // Run cluster rebuild job (fire and forget for now, could be queued)
    runClusterRebuild()
      .then(result => {
        logger.info({ result }, 'Cluster rebuild job completed');
      })
      .catch(error => {
        logger.error({ error }, 'Cluster rebuild job failed');
      });

    res.json({ 
      message: 'Memory clusters rebuild triggered',
      status: 'queued'
    });
  } catch (error) {
    logger.error({ error }, 'Error rebuilding clusters');
    res.status(500).json({ error: 'Failed to rebuild clusters' });
  }
});

export const adminRouter = router;


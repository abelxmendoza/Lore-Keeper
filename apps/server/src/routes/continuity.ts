import { Router } from 'express';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../logger';
import { continuityService } from '../services/continuity/continuityService';
import { continuityEngineJob } from '../jobs/continuityEngineJob';

const router = Router();

/**
 * GET /api/continuity/events
 * Get continuity events for user
 */
router.get('/events', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { type, limit } = req.query;

    const events = await continuityService.getContinuityEvents(
      req.user!.id,
      type as string | undefined,
      limit ? parseInt(limit as string) : 50
    );

    res.json({ events });
  } catch (error) {
    logger.error({ error }, 'Failed to get continuity events');
    res.status(500).json({
      error: 'Failed to get continuity events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/continuity/run
 * Manually trigger continuity analysis
 */
router.post('/run', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    // Run analysis in background
    continuityService
      .runContinuityAnalysis(req.user!.id)
      .then(result => {
        logger.info({ userId: req.user!.id, eventCount: result.events.length }, 'Continuity analysis completed');
      })
      .catch(error => {
        logger.error({ error, userId: req.user!.id }, 'Continuity analysis failed');
      });

    res.json({
      message: 'Continuity analysis started',
      status: 'processing',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start continuity analysis');
    res.status(500).json({
      error: 'Failed to start continuity analysis',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/continuity/goals
 * Get goals (active and abandoned)
 */
router.get('/goals', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const goals = await continuityService.getGoals(req.user!.id);

    res.json(goals);
  } catch (error) {
    logger.error({ error }, 'Failed to get goals');
    res.status(500).json({
      error: 'Failed to get goals',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/continuity/contradictions
 * Get contradictions
 */
router.get('/contradictions', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const contradictions = await continuityService.getContradictions(req.user!.id);

    res.json({ contradictions });
  } catch (error) {
    logger.error({ error }, 'Failed to get contradictions');
    res.status(500).json({
      error: 'Failed to get contradictions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const continuityRouter = router;

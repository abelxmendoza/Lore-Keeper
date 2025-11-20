import { Router } from 'express';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../logger';
import { continuityService } from '../services/continuity/continuityService';
import { resolutionService } from '../services/continuity/resolutionService';
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

/**
 * GET /api/continuity/contradiction/:eventId/details
 * Get full contradiction details with components
 */
router.get('/contradiction/:eventId/details', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;
    const details = await resolutionService.getContradictionDetails(eventId, req.user!.id);

    res.json(details);
  } catch (error) {
    logger.error({ error, eventId: req.params.eventId }, 'Failed to get contradiction details');
    res.status(500).json({
      error: 'Failed to get contradiction details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/continuity/contradiction/:eventId/evidence
 * Get evidence for a contradiction
 */
router.get('/contradiction/:eventId/evidence', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;
    const evidence = await resolutionService.getContradictionEvidence(eventId, req.user!.id);

    res.json(evidence);
  } catch (error) {
    logger.error({ error, eventId: req.params.eventId }, 'Failed to get contradiction evidence');
    res.status(500).json({
      error: 'Failed to get contradiction evidence',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/continuity/contradiction/:eventId/timeline
 * Get timeline context for a contradiction
 */
router.get('/contradiction/:eventId/timeline', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;
    const timeline = await resolutionService.getContradictionTimeline(eventId, req.user!.id);

    res.json({ timeline });
  } catch (error) {
    logger.error({ error, eventId: req.params.eventId }, 'Failed to get contradiction timeline');
    res.status(500).json({
      error: 'Failed to get contradiction timeline',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/continuity/contradiction/:eventId/resolve
 * Resolve a contradiction
 */
router.post('/contradiction/:eventId/resolve', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;
    const resolution = req.body;

    const resolved = await resolutionService.resolveContradiction(eventId, req.user!.id, resolution);

    res.json({ event: resolved });
  } catch (error) {
    logger.error({ error, eventId: req.params.eventId }, 'Failed to resolve contradiction');
    res.status(500).json({
      error: 'Failed to resolve contradiction',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/continuity/contradiction/:eventId/suggest
 * Get AI resolution suggestion
 */
router.post('/contradiction/:eventId/suggest', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;
    const suggestion = await resolutionService.generateAISuggestion(eventId, req.user!.id);

    res.json(suggestion);
  } catch (error) {
    logger.error({ error, eventId: req.params.eventId }, 'Failed to generate AI suggestion');
    res.status(500).json({
      error: 'Failed to generate AI suggestion',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const continuityRouter = router;

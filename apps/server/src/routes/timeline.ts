import { Router } from 'express';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { getTimeline } from '../controllers/timelineController';
import { memoryService } from '../services/memoryService';

const router = Router();

router.get('/', requireAuth, getTimeline);

router.get('/tags', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const tags = await memoryService.listTags(req.user!.id);
    res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch tags' });
  }
});

export const timelineRouter = router;

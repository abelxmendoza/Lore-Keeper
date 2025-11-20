/**
 * Timeline V2 API Routes
 * Enhanced timeline endpoint
 */

import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../services/supabaseClient';
import { logger } from '../logger';

const router = Router();

/**
 * GET /api/timeline-v2
 * Get timeline items for Timeline V2 component
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    // Fetch journal entries as timeline items
    const { data: entries, error } = await supabaseAdmin
      .from('journal_entries')
      .select('id, content, created_at, tags, location')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      logger.error({ error, userId }, 'Failed to fetch timeline items');
      return res.status(500).json({ error: 'Failed to fetch timeline items' });
    }

    // Transform entries into timeline items
    const items = (entries || []).map(entry => {
      // Extract title from content (first line or first 50 chars)
      const contentLines = entry.content?.split('\n') || [];
      const title = contentLines[0]?.trim() || entry.content?.substring(0, 50) || 'Untitled Entry';
      const summary = entry.content?.substring(0, 200) || 'No summary available';

      return {
        id: entry.id,
        title: title.length > 100 ? title.substring(0, 100) + '...' : title,
        summary: summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
        timestamp: entry.created_at,
        location: entry.location || undefined,
        tags: entry.tags || [],
        characters: [] // TODO: Extract characters from entry
      };
    });

    res.json({ items });
  } catch (error) {
    logger.error({ error }, 'Error fetching timeline items');
    res.status(500).json({ error: 'Failed to fetch timeline items' });
  }
});

export const timelineV2Router = router;


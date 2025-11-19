import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { memoirService } from '../services/memoirService';
import { logger } from '../logger';
import { omegaChatService } from '../services/omegaChatService';

const router = Router();

// Get biography sections (maps to memoir outline)
router.get('/sections', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const outline = await memoirService.getOutline(req.user!.id);
    
    // Handle different possible outline formats
    let sections: any[] = [];
    
    if (outline && typeof outline === 'object') {
      if (Array.isArray(outline.sections)) {
        sections = outline.sections;
      } else if (Array.isArray(outline)) {
        sections = outline;
      }
    }
    
    // Transform memoir sections to biography sections format
    const biographySections = sections.map((section: any) => ({
      id: section.id || section.section_id || `section-${Date.now()}-${Math.random()}`,
      title: section.title || section.section_title || 'Untitled Section',
      content: section.content || section.section_content || '',
      order: section.order || section.section_order || 0,
      period: section.period || (section.period_from && section.period_to ? {
        from: section.period_from,
        to: section.period_to
      } : undefined),
      lastUpdated: section.lastUpdated || section.last_updated || section.updated_at || new Date().toISOString()
    }));
    
    res.json({ sections: biographySections });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get biography sections');
    // Return empty sections instead of error - allows the UI to work
    res.json({ sections: [] });
  }
});

// Chat endpoint for biography editing
const chatSchema = z.object({
  message: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })).optional()
});

router.post('/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { message, conversationHistory = [] } = parsed.data;
    
    // Use the chat service to generate a response
    // The chat service will handle biography-specific context
    const response = await omegaChatService.chat(req.user!.id, message, conversationHistory);
    
    // Get updated sections after chat
    const outline = await memoirService.getOutline(req.user!.id);
    const sections = outline.sections?.map((section: any) => ({
      id: section.id,
      title: section.title,
      content: section.content || '',
      order: section.order || 0,
      period: section.period,
      lastUpdated: section.lastUpdated || section.last_updated
    })) || [];
    
    res.json({
      answer: response.answer,
      sections
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to process biography chat');
    res.status(500).json({ 
      error: 'Failed to process request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const biographyRouter = router;


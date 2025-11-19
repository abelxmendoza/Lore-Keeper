import { Router } from 'express';
import { z } from 'zod';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { memoirService } from '../services/memoirService';
import { logger } from '../logger';
import { omegaChatService } from '../services/omegaChatService';
import { dateAssignmentService } from '../services/dateAssignmentService';
import { timeEngine } from '../services/timeEngine';

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
    
    // Extract dates from the message for biography sections
    const extractedDates = await omegaChatService.extractDatesAndTimes(message);
    
    // Use the chat service to generate a response
    // The chat service will handle biography-specific context
    const response = await omegaChatService.chat(req.user!.id, message, conversationHistory);
    
    // Get updated sections after chat
    const outline = await memoirService.getOutline(req.user!.id);
    
    // Enhance sections with extracted dates
    const sections = outline.sections?.map((section: any) => {
      // Try to extract dates from section content if not already present
      let period = section.period;
      let dateMetadata: any = section.dateMetadata || {};
      
      if (!period && extractedDates.length > 0) {
        // Use extracted dates to create period
        const dates = extractedDates
          .map(d => ({ date: new Date(d.date), confidence: d.confidence || 0 }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());
        
        if (dates.length >= 2) {
          period = {
            from: dates[0].date.toISOString(),
            to: dates[dates.length - 1].date.toISOString()
          };
          dateMetadata = {
            precision: extractedDates[0]?.precision || 'day',
            confidence: dates[0].confidence,
            source: 'extracted',
            extractedAt: new Date().toISOString()
          };
        } else if (dates.length === 1) {
          period = {
            from: dates[0].date.toISOString(),
            to: dates[0].date.toISOString()
          };
          dateMetadata = {
            precision: extractedDates[0]?.precision || 'day',
            confidence: dates[0].confidence,
            source: 'extracted',
            extractedAt: new Date().toISOString()
          };
        }
      }
      
      return {
        id: section.id,
        title: section.title,
        content: section.content || '',
        order: section.order || 0,
        period: period || section.period,
        dateMetadata,
        lastUpdated: section.lastUpdated || section.last_updated || new Date().toISOString()
      };
    }) || [];
    
    // Update outline with enhanced sections if dates were extracted
    if (extractedDates.length > 0 && sections.length > 0) {
      const updatedOutline = {
        ...outline,
        sections: sections.map((s: any) => ({
          ...s,
          period: s.period,
          dateMetadata: s.dateMetadata
        }))
      };
      await memoirService.saveOutline(req.user!.id, updatedOutline as any);
    }
    
    res.json({
      answer: response.answer,
      sections,
      extractedDates: extractedDates.map(d => ({
        date: d.date,
        precision: d.precision,
        confidence: d.confidence,
        context: d.context
      }))
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


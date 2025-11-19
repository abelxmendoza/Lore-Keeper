/**
 * Essence Profile API Routes
 * Handles essence profile retrieval, extraction, and management
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { essenceProfileService } from '../services/essenceProfileService';
import { logger } from '../logger';
import { memoryService } from '../services/memoryService';

const router = Router();

/**
 * GET /api/essence/profile
 * Get user's current essence profile
 */
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const profile = await essenceProfileService.getProfile(req.user!.id);
    res.json({ profile });
  } catch (error) {
    logger.error({ error }, 'Failed to get essence profile');
    res.status(500).json({ error: 'Failed to get essence profile' });
  }
});

/**
 * POST /api/essence/extract
 * Trigger manual essence extraction from recent entries
 */
router.post('/extract', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const entries = await memoryService.searchEntries(req.user!.id, { limit: 50 });
    const entriesData = entries.map(e => ({
      content: e.content,
      date: e.date,
      summary: e.summary || undefined
    }));

    const insights = await essenceProfileService.extractEssence(req.user!.id, [], entriesData);
    
    if (Object.keys(insights).length > 0) {
      await essenceProfileService.updateProfile(req.user!.id, insights);
    }

    res.json({ insights, updated: true });
  } catch (error) {
    logger.error({ error }, 'Failed to extract essence');
    res.status(500).json({ error: 'Failed to extract essence' });
  }
});

/**
 * PUT /api/essence/skills
 * Update skills (user-curated)
 */
const updateSkillsSchema = z.object({
  skills: z.array(z.object({
    skill: z.string(),
    confidence: z.number().optional(),
    evidence: z.array(z.string()).optional()
  }))
});

router.put('/skills', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = updateSkillsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const profile = await essenceProfileService.getProfile(req.user!.id);
    const now = new Date().toISOString();
    
    const updatedSkills = parsed.data.skills.map(s => ({
      skill: s.skill,
      confidence: s.confidence || 1.0,
      evidence: s.evidence || [],
      extractedAt: now
    }));

    await essenceProfileService.updateProfile(req.user!.id, {
      topSkills: updatedSkills
    });

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to update skills');
    res.status(500).json({ error: 'Failed to update skills' });
  }
});

/**
 * GET /api/essence/evolution
 * Get evolution timeline
 */
router.get('/evolution', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const evolution = await essenceProfileService.getEvolution(req.user!.id);
    res.json({ evolution });
  } catch (error) {
    logger.error({ error }, 'Failed to get evolution');
    res.status(500).json({ error: 'Failed to get evolution' });
  }
});

/**
 * POST /api/essence/refine
 * User refines/corrects AI findings
 */
const refineSchema = z.object({
  type: z.enum(['hopes', 'dreams', 'fears', 'strengths', 'weaknesses', 'coreValues', 'personalityTraits', 'relationshipPatterns']),
  action: z.enum(['add', 'remove', 'update']),
  data: z.any()
});

router.post('/refine', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = refineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const profile = await essenceProfileService.getProfile(req.user!.id);
    const { type, action, data } = parsed.data;

    if (action === 'add') {
      const now = new Date().toISOString();
      const newItem = {
        text: data.text || data.skill,
        confidence: 1.0, // User-added items have full confidence
        extractedAt: now,
        sources: ['user-curated'],
        ...(data.evidence && { evidence: data.evidence })
      };

      if (type === 'topSkills') {
        profile.topSkills.push(newItem as any);
      } else {
        (profile[type] as any[]).push(newItem);
      }
    } else if (action === 'remove') {
      if (type === 'topSkills') {
        profile.topSkills = profile.topSkills.filter((s: any) => s.skill !== data.skill);
      } else {
        (profile[type] as any[]) = (profile[type] as any[]).filter((item: any) => item.text !== data.text);
      }
    } else if (action === 'update') {
      if (type === 'topSkills') {
        const skill = profile.topSkills.find((s: any) => s.skill === data.skill);
        if (skill) {
          Object.assign(skill, data);
        }
      } else {
        const item = (profile[type] as any[]).find((i: any) => i.text === data.text);
        if (item) {
          Object.assign(item, data);
        }
      }
    }

    await essenceProfileService.updateProfile(req.user!.id, profile);
    res.json({ success: true, profile });
  } catch (error) {
    logger.error({ error }, 'Failed to refine essence profile');
    res.status(500).json({ error: 'Failed to refine essence profile' });
  }
});

export const essenceRouter = router;



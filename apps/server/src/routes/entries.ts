import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';

import { requireAuth, type AuthenticatedRequest } from '../middleware/auth';
import { chapterService } from '../services/chapterService';
import { memoryService } from '../services/memoryService';
import { tagService } from '../services/tagService';
import { voiceService } from '../services/voiceService';
import { extractTags, shouldPersistMessage } from '../utils/keywordDetector';
import { emitDelta } from '../realtime/orchestratorEmitter';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const entrySchema = z.object({
  content: z.string().min(3),
  date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  chapterId: z.string().nullable().optional(),
  mood: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  source: z.enum(['chat', 'manual', 'api', 'system', 'photo', 'calendar', 'x']).optional(),
  metadata: z.record(z.any()).optional(),
  relationships: z
    .array(
      z.object({
        name: z.string().min(1),
        tag: z.enum(['friend', 'family', 'coach', 'romantic', 'professional', 'other'])
      })
    )
    .optional()
});

const entryQuerySchema = z.object({
  search: z.string().optional(),
  tag: z.string().optional(),
  chapterId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
  semantic: z.coerce.boolean().optional(),
  threshold: z.coerce.number().min(0).max(1).optional(),
});

/**
 * @swagger
 * /api/entries:
 *   get:
 *     summary: Get journal entries
 *     tags: [Entries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag
 *       - in: query
 *         name: chapterId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by chapter
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *         description: Maximum number of entries to return
 *       - in: query
 *         name: semantic
 *         schema:
 *           type: boolean
 *         description: Use semantic search
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *         description: Semantic search threshold
 *     responses:
 *       200:
 *         description: List of entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entries:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Entry'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', requireAuth, validateQuery(entryQuerySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const { tag, search, chapterId, from, to, semantic, threshold, limit } = req.query;
    const entries = await memoryService.searchEntries(req.user!.id, {
      tag: tag as string | undefined,
      search: search as string | undefined,
      chapterId: chapterId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      semantic: semantic as boolean | undefined,
      threshold: threshold as number | undefined,
      limit: limit as number | undefined
    });
    res.json({ entries });
  } catch (error) {
    logger.error({ error, requestId: req.requestId }, 'Error fetching entries');
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch entries' });
  }
});

/**
 * @swagger
 * /api/entries:
 *   post:
 *     summary: Create a new journal entry
 *     tags: [Entries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 3
 *               date:
 *                 type: string
 *                 format: date-time
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               chapterId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               mood:
 *                 type: string
 *                 nullable: true
 *               summary:
 *                 type: string
 *                 nullable: true
 *               source:
 *                 type: string
 *                 enum: [chat, manual, api, system, photo, calendar, x]
 *               metadata:
 *                 type: object
 *               relationships:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Entry created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 entry:
 *                   $ref: '#/components/schemas/Entry'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', requireAuth, validateBody(entrySchema), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = entrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error.flatten());
    }

    if (parsed.data.chapterId) {
      try {
        const chapter = await chapterService.getChapter(req.user!.id, parsed.data.chapterId);
        if (!chapter) {
          return res.status(400).json({ error: 'Invalid chapter assignment' });
        }
      } catch (error) {
        logger.warn({ error, chapterId: parsed.data.chapterId }, 'Error checking chapter, continuing without assignment');
        // Continue without chapter assignment if check fails
      }
    }

    const entry = await memoryService.saveEntry({
      userId: req.user!.id,
      ...parsed.data,
      tags: parsed.data.tags ?? extractTags(parsed.data.content),
      metadata: parsed.data.metadata,
      relationships: parsed.data.relationships
    });

    void emitDelta('timeline.add', { entry }, req.user!.id);

    res.status(201).json({ entry });
  } catch (error) {
    logger.error({ error }, 'Error creating entry');
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create entry' });
  }
});

router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const entryId = req.params.id;
    const parsed = entrySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(parsed.error.flatten());
    }

    // Get existing entry
    const existingEntry = await memoryService.getEntry(req.user!.id, entryId);
    if (!existingEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    // Update entry
    const updatedEntry = await memoryService.updateEntry(req.user!.id, entryId, {
      content: parsed.data.content,
      tags: parsed.data.tags,
      chapterId: parsed.data.chapterId,
      mood: parsed.data.mood,
      summary: parsed.data.summary,
      metadata: parsed.data.metadata,
      relationships: parsed.data.relationships
    });

    void emitDelta('timeline.update', { entry: updatedEntry }, req.user!.id);

    res.json({ entry: updatedEntry });
  } catch (error) {
    logger.error({ error }, 'Error updating entry');
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update entry' });
  }
});

router.post('/suggest-tags', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { content } = entrySchema.pick({ content: true }).parse(req.body);
  const tags = await tagService.suggestTags(content);
  res.json({ tags });
});

router.post('/detect', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { content } = entrySchema.pick({ content: true }).parse(req.body);
  const shouldSave = shouldPersistMessage(content);
  res.json({ shouldSave, tags: extractTags(content) });
});

router.post('/voice', requireAuth, upload.single('audio'), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Audio file is required' });
  }

  const transcript = await voiceService.transcribe(req.file);
  const formatted = await voiceService.formatTranscript(transcript);
  const entry = await memoryService.saveEntry({
    userId: req.user!.id,
    content: formatted.content,
    summary: formatted.summary,
    tags: formatted.tags,
    mood: formatted.mood,
    metadata: { transcript, source: 'voice' },
    source: 'manual'
  });

  void emitDelta('timeline.add', { entry }, req.user!.id);

  res.status(201).json({ entry, transcript, formatted });
});

export const entriesRouter = router;

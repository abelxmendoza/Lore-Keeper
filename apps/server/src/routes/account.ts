// © 2025 Abel Mendoza — Omega Technologies. All Rights Reserved.

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabaseAdmin } from '../services/supabaseClient';

export const accountRouter = Router();

const timelineRoot = path.resolve(process.cwd(), 'lorekeeper', 'timeline');

accountRouter.get('/export', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const tables = ['journal_entries', 'chapters', 'tasks', 'timeline_events', 'people_places', 'character_relationships'];
  const payload: Record<string, unknown> = { user_id: userId, generated_at: new Date().toISOString() };

  for (const table of tables) {
    const { data } = await supabaseAdmin.from(table).select('*').eq('user_id', userId);
    payload[table] = data ?? [];
  }

  const archive = zlib.gzipSync(Buffer.from(JSON.stringify(payload, null, 2), 'utf-8'));
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="lorekeeper-export.json.gz"');
  return res.send(archive);
});

accountRouter.post('/delete', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const tables = ['journal_entries', 'chapters', 'tasks', 'timeline_events', 'task_memory_bridges', 'people_places', 'character_relationships'];

  for (const table of tables) {
    await supabaseAdmin.from(table).delete().eq('user_id', userId);
  }

  const userTimelineDir = path.join(timelineRoot, userId);
  if (fs.existsSync(userTimelineDir)) {
    fs.rmSync(userTimelineDir, { recursive: true, force: true });
  }

  return res.json({ status: 'deleted', message: 'Account data removed and sessions should be re-authenticated.' });
});

export default accountRouter;

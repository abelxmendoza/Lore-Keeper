# Memory Engine API Quick Reference

## Overview

The Memory Engine automatically extracts memories from chat conversations, breaks them into components, and links them to the timeline hierarchy.

## Quick Start

### 1. Start a Conversation Session

```bash
POST /api/memory-engine/session/start
Content-Type: application/json

{
  "title": "Optional session title",
  "metadata": {}
}
```

**Response**:
```json
{
  "session": {
    "id": "uuid",
    "user_id": "uuid",
    "started_at": "2025-01-25T...",
    "ended_at": null,
    ...
  }
}
```

### 2. Save Messages

```bash
POST /api/memory-engine/message
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "role": "user",
  "content": "Bro yesterday I went to the pier with my cousin and we talked about our family history."
}
```

**Note**: If `sessionId` is omitted, automatically creates/uses active session.

### 3. End Session (Auto-queues Extraction)

```bash
POST /api/memory-engine/session/end
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "summary": "Optional summary"
}
```

**Note**: Ending a session automatically queues it for background memory extraction.

### 4. Extract Memory Immediately (Optional)

```bash
POST /api/memory-engine/extract
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "immediate": true
}
```

**Response**:
```json
{
  "success": true,
  "journalEntry": { ... },
  "components": [
    {
      "id": "uuid",
      "component_type": "event",
      "text": "...",
      "importance_score": 8,
      ...
    }
  ],
  "timelineLinks": [ ... ],
  "extractionConfidence": 0.85
}
```

### 5. Query Results

**Get components for a journal entry**:
```bash
GET /api/memory-engine/entry/{entryId}/components
```

**Get timeline links for a component**:
```bash
GET /api/memory-engine/component/{componentId}/timeline
```

**Get components for a timeline level**:
```bash
GET /api/memory-engine/timeline/chapter/{chapterId}/components
GET /api/memory-engine/timeline/arc/{arcId}/components
```

## Integration with Existing Chat

The memory engine can be integrated with existing chat endpoints:

1. **Modify chat endpoints** to save messages to `conversation_messages`
2. **Auto-detect** memory-worthy conversations
3. **Auto-extract** when session ends or user requests

Example integration:
```typescript
// In chat endpoint
const message = await conversationService.saveMessage({
  sessionId: activeSession.id,
  userId: req.user!.id,
  role: 'user',
  content: req.body.message,
});

// Check if memory-worthy
const detection = await ruleBasedMemoryDetectionService.detectMemoryWorthy(message.content);
if (detection.isMemoryWorthy) {
  // Queue for extraction or extract immediately
}
```

## Background Processing

The background worker automatically:
- Processes ended sessions every 1 minute
- Extracts memories in batches of 10
- Updates session metadata with extraction status
- Handles errors gracefully

**Extraction Status** (in session.metadata):
- `pending` - Queued for processing
- `processing` - Currently being processed
- `completed` - Successfully extracted
- `failed` - Extraction failed (error in metadata)

## Cost Optimization

The system is designed to minimize API costs:

1. **Rule-based detection first** (FREE)
   - Only calls LLM if confidence < 0.4
   - Pattern matching for keywords, emotions, relationships

2. **Aggressive caching**
   - Detection results cached (500 items)
   - Component extractions cached (500 items)
   - Embeddings reused from existing cache

3. **Batch processing**
   - Processes multiple sessions together
   - Reduces API overhead

4. **Deferred processing**
   - Messages stored immediately (fast)
   - Extraction happens in background
   - User can request immediate extraction if needed

## Error Handling

All endpoints return standard error format:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common errors:
- `400` - Invalid request (missing fields, invalid format)
- `404` - Session/entry not found
- `500` - Server error (check logs)

## Testing

Use the `/detect` endpoint to test memory detection:
```bash
POST /api/memory-engine/detect
{
  "content": "Yesterday I met with Sarah and we discussed the project.",
  "conversationContext": []
}
```

## Performance Notes

- **Cached requests**: <100ms
- **Rule-based extraction**: <500ms
- **LLM extraction**: <5s
- **Background processing**: Non-blocking, runs every 1 minute

## Monitoring

Check extraction status:
```bash
GET /api/memory-engine/session/{sessionId}
# Check metadata.extractionStatus
```

Worker stats (in logs):
- Processed count
- Error count
- Skipped count


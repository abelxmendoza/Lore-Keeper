# Memory Engine - Technical Implementation Specification

## Optimal Data Structures & Algorithms

### In-Memory Data Structures

#### 1. LRU Cache (Memory Cache)
**Implementation**: `Map<string, T>` with doubly-linked list for O(1) access and eviction
- **Use for**: Detection results, component extractions, timeline assignments
- **Size**: 500 items per cache type
- **Eviction**: Least recently used when capacity exceeded
- **Pattern**: Follow existing `embeddingCacheService` pattern

```typescript
class LRUCache<T> {
  private cache: Map<string, T>;
  private accessOrder: string[]; // Doubly-linked list simulation
  private maxSize: number;
  
  get(key: string): T | null;
  set(key: string, value: T): void;
  evict(): void; // Remove LRU item
}
```

#### 2. Content Hash Map
**Algorithm**: SHA-256 hashing for cache keys
- **Normalization**: Trim, lowercase, slice(0, 8000) before hashing
- **Use for**: All cache key generation (consistent with existing pattern)
- **Implementation**: Reuse `hashContent()` from `embeddingCacheService`

#### 3. Trie (Prefix Tree)
**Use for**: Fast keyword matching in rule-based detection
- **Benefits**: O(m) search time where m = keyword length
- **Implementation**: For memory detection keywords, component type patterns
- **Use case**: Check if message contains memory-worthy keywords

```typescript
class Trie {
  private root: TrieNode;
  
  insert(word: string): void;
  search(word: string): boolean;
  startsWith(prefix: string): boolean;
}
```

#### 4. Bloom Filter (Optional)
**Use for**: Quick negative checks before expensive operations
- **Benefits**: O(1) membership test, space-efficient
- **Use case**: Check if content already processed before LLM call
- **False positive rate**: ~1% acceptable for cost savings

#### 5. Priority Queue
**Implementation**: Min-heap for background job processing
- **Use for**: Deferred extraction queue (priority by user request, then FIFO)
- **Benefits**: O(log n) insert/extract, efficient batch processing
- **Priority levels**: Immediate (user request), High (recent sessions), Normal (queued)

```typescript
class PriorityQueue<T> {
  private heap: T[];
  private compare: (a: T, b: T) => number;
  
  enqueue(item: T): void;
  dequeue(): T | null;
  peek(): T | null;
}
```

#### 6. Graph Structures
- **Adjacency List**: `Map<nodeId, List<Edge>>` for Memory Fabric graph
- **Index by Type**: `Map<type, List<nodeId>>` for fast type-based queries
- **Use existing**: `MemoryFabric` pattern from codebase
- **Edge types**: semantic, temporal, narrative, emotional, identity, tag, character

#### 7. Sliding Window Buffer
**Implementation**: Circular buffer for conversation context
- **Size**: Last 6-10 messages for context
- **Use for**: Conversation session context without storing full history
- **Benefits**: Constant memory, O(1) append

```typescript
class SlidingWindow<T> {
  private buffer: T[];
  private maxSize: number;
  private head: number;
  
  append(item: T): void;
  getWindow(): T[];
  clear(): void;
}
```

### Algorithms

#### 1. Content-Based Hashing
**Algorithm**: SHA-256(content_normalized)
- **Normalization**: trim, lowercase, slice(0, 8000)
- **Use for**: All cache keys (consistent with embeddingCacheService)
- **Implementation**: Reuse existing `hashContent()` function

#### 2. Cosine Similarity
**Formula**: dot(a,b) / (||a|| * ||b||)
- **Use for**: Semantic matching of components, timeline assignment
- **Optimization**: Pre-normalize vectors, use vectorized operations
- **Database**: Use pgvector `<=>` operator for efficient similarity search

#### 3. Batch Processing Algorithm
**Strategy**: Group by user_id, process in chunks of 10-50
- **Benefits**: Reduce API overhead, amortize costs
- **Use for**: Embedding generation, timeline assignments, component extraction
- **Implementation**: 
  ```typescript
  async processBatch<T>(items: T[], batchSize: number, processor: (batch: T[]) => Promise<void>): Promise<void>
  ```

#### 4. Incremental Graph Updates
**Strategy**: Only update affected nodes/edges
- **Algorithm**: BFS from changed node, update neighbors within depth 2
- **Benefits**: Avoid full graph rebuild, O(k) where k = affected nodes
- **Use for**: Memory Fabric graph updates when components added

#### 5. Pattern Matching (Rule-Based)
**Algorithm**: Regex patterns + Set operations for deduplication
- **Optimization**: Compile regex once, reuse across messages
- **Use for**: Memory detection, component extraction, fact extraction
- **Pattern**: Follow `ruleBasedTagExtractionService` and `ruleBasedFactExtractionService`

#### 6. Lazy Evaluation
**Strategy**: Defer expensive operations until needed
- **Use for**: Timeline assignment, graph updates, component extraction
- **Trigger**: User request or background worker (off-peak)
- **Benefits**: Reduce immediate costs, improve response time

#### 7. Deduplication Algorithm
**Strategy**: Set-based deduplication with composite keys
- **Key format**: `${subject}:${attribute}:${value}` (lowercase)
- **Use for**: Facts, components, timeline links
- **Complexity**: O(n) time, O(n) space

### Database Design Patterns

#### 1. Partitioning Strategy
- **Partition `conversation_messages`** by `user_id` (implicit via RLS)
- **Partition `memory_components`** by `journal_entry_id` (logical grouping)
- **Benefits**: Faster queries, easier maintenance
- **Note**: PostgreSQL table partitioning for very large tables (future)

#### 2. Index Strategy

**Composite Indexes** (Multi-column for common queries):
```sql
-- Conversation sessions: user + time range queries
CREATE INDEX idx_sessions_user_time ON conversation_sessions(user_id, started_at DESC);

-- Messages: session + chronological order
CREATE INDEX idx_messages_session_time ON conversation_messages(session_id, created_at ASC);

-- Components: entry + type filtering
CREATE INDEX idx_components_entry_type ON memory_components(journal_entry_id, component_type);

-- Timeline links: component + hierarchy level
CREATE INDEX idx_timeline_component_level ON timeline_links(component_id, arc_id, chapter_id);
```

**GIN Indexes** (Array fields):
```sql
-- Components: character involvement array
CREATE INDEX idx_components_characters_gin ON memory_components USING GIN(characters_involved);

-- Components: tags array
CREATE INDEX idx_components_tags_gin ON memory_components USING GIN(tags);
```

**IVFFlat Indexes** (Vector similarity):
```sql
-- Components: embedding similarity search
CREATE INDEX idx_components_embedding ON memory_components 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Partial Indexes** (Filtered for common queries):
```sql
-- Active sessions only
CREATE INDEX idx_sessions_active ON conversation_sessions(user_id, started_at DESC) 
  WHERE ended_at IS NULL;

-- High importance components
CREATE INDEX idx_components_important ON memory_components(journal_entry_id, importance_score DESC) 
  WHERE importance_score >= 7;
```

**Covering Indexes** (Include frequently accessed columns):
```sql
-- Messages with content preview
CREATE INDEX idx_messages_session_covering ON conversation_messages(session_id, created_at) 
  INCLUDE (role, content);
```

#### 3. Foreign Key Strategy
- **CASCADE DELETE**: `memory_components` → `journal_entries` (components deleted with entry)
- **CASCADE DELETE**: `timeline_links` → `memory_components` (links deleted with component)
- **SET NULL**: `conversation_messages` → `conversation_sessions` (preserve messages if session deleted)
- **Benefits**: Data integrity, automatic cleanup

#### 4. JSONB Indexing
- **GIN index** on `metadata` JSONB for flexible queries
- **Extract common fields** to columns for better performance
- **Use JSONB** for flexible schema, columns for frequent queries

#### 5. Materialized Views** (Future Optimization)
- **Pre-compute**: Session summaries, component counts per entry
- **Refresh**: On-demand or scheduled (not real-time)
- **Benefits**: Fast aggregations, reduced query complexity

#### 6. Check Constraints
```sql
-- Ensure valid component types
ALTER TABLE memory_components ADD CONSTRAINT check_component_type 
  CHECK (component_type IN ('event', 'thought', 'reflection', 'decision', 'relationship_update', 'worldbuilding', 'lore_drop', 'timeline_marker'));

-- Ensure valid importance scores
ALTER TABLE memory_components ADD CONSTRAINT check_importance_score 
  CHECK (importance_score >= 0 AND importance_score <= 10);

-- Ensure valid roles
ALTER TABLE conversation_messages ADD CONSTRAINT check_role 
  CHECK (role IN ('user', 'assistant'));
```

#### 7. Row Level Security (RLS)
- **Pattern**: `auth.uid() = user_id` for all user-scoped tables
- **Policies**: SELECT, INSERT, UPDATE (and DELETE where appropriate)
- **Benefits**: Automatic data isolation, security at database level

#### 8. Connection Pooling
- **Use existing**: Supabase connection patterns
- **Pool size**: Based on expected concurrent users
- **Benefits**: Reduced connection overhead

### Query Optimization Patterns

#### 1. Batch Queries
- **Strategy**: Use `IN` clauses for multiple IDs
- **Limit**: 100-500 IDs per query (PostgreSQL limit)
- **Use for**: Fetching multiple components, timeline links
- **Example**: `SELECT * FROM memory_components WHERE journal_entry_id IN ($1, $2, ...)`

#### 2. Eager Loading
- **Strategy**: JOIN tables in single query when relationships needed
- **Use for**: Entry + components + timeline links in one query
- **Benefits**: Reduce round trips, improve performance
- **Example**: `SELECT e.*, c.*, t.* FROM journal_entries e LEFT JOIN memory_components c ON e.id = c.journal_entry_id LEFT JOIN timeline_links t ON c.id = t.component_id`

#### 3. Pagination
- **Strategy**: Cursor-based pagination (use `created_at` + `id`)
- **Benefits**: Consistent results, efficient for large datasets
- **Use for**: Messages, components, sessions
- **Example**: `SELECT * FROM conversation_messages WHERE session_id = $1 AND (created_at, id) > ($2, $3) ORDER BY created_at, id LIMIT 50`

#### 4. Query Result Caching
- **Strategy**: Cache expensive query results (session summaries, component lists)
- **TTL**: 5 minutes for dynamic data, longer for static
- **Invalidation**: On write operations
- **Implementation**: Use existing cache service patterns

#### 5. Lazy Loading
- **Strategy**: Load relationships on-demand
- **Use for**: Timeline hierarchy (load parent levels when needed)
- **Benefits**: Reduce initial query time

### Performance Targets

- **Cache hit rate**: >80% for repeated content
- **Rule-based extraction**: >60% of cases (avoid LLM calls)
- **Query response time**: <100ms for cached, <500ms for database queries
- **Batch processing**: Process 10-50 items per batch
- **API cost**: <$5/month additional costs
- **Memory usage**: <500MB for in-memory caches

### Implementation Priority

1. **High Priority** (Core functionality):
   - LRU Cache implementation
   - Content hashing
   - Composite indexes
   - Batch processing
   - Rule-based detection

2. **Medium Priority** (Optimization):
   - GIN indexes for arrays
   - IVFFlat indexes for vectors
   - Priority queue for background jobs
   - Query result caching

3. **Low Priority** (Future enhancements):
   - Bloom filters
   - Materialized views
   - Table partitioning
   - Advanced graph algorithms


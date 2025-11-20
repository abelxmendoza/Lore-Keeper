# Code Cleanup Checklist

## ✅ Immediate Fixes (Do Now)

### 1. Duplicate Imports
- [x] Remove duplicate `chapterService` import in `omegaChatService.ts` (line 19) ✅ **DONE**

### 2. Unused Routes
- [x] Remove `ladderRouter` from `apps/server/src/routes/ladder.ts` ✅ **DONE**
- [x] Remove `ladderRouter` registration from `apps/server/src/index.ts` ✅ **DONE**
- [x] Delete `apps/server/src/services/ladderService.ts` (if confirmed unused) ✅ **DONE**

### 3. Unused Services
- [x] Evaluate `enhancedChatService.ts` - remove if not needed ✅ **DONE - REMOVED**
- [x] Check `chatService.ts` usage - consolidate if possible ✅ **VERIFIED - USED** (2 places: chaptersController, summary routes)

## 🔍 Verification Needed

### Routes to Verify
- [x] Check `/api/journal` usage in frontend ✅ **VERIFIED - USED** (useNotebookEngine.ts)
- [x] Check `/api/notebook` usage in frontend ✅ **VERIFIED - USED** (provides `/api/arcs/suggestions`, `/api/moods/score`, `/api/memory-preview`)
- [x] Check `/api/timeline-v2` - consolidate with `/api/timeline`? ✅ **VERIFIED - USED** (TimelineV2.tsx)
- [x] Check `/api/ladder` - remove if unused ✅ **DONE - REMOVED**

### Services to Verify
- [x] `namingService` - check usage ✅ **VERIFIED - USED** (chaptersController, naming routes)
- [x] `canonicalService` - check usage ✅ **VERIFIED - USED** (canon routes)
- [x] `conversationService` - check usage ✅ **VERIFIED - USED** (memoryEngine routes, memoryExtractionService)
- [x] `enhancedChatService` - check if needed ✅ **DONE - REMOVED**

## 📋 Testing Before Removal

Before removing any code:
- [ ] Run all tests: `npm test`
- [ ] Check frontend builds: `npm run build`
- [ ] Verify no runtime errors
- [ ] Check CI/CD pipeline passes

## 🎯 After Cleanup

- [ ] Update README with current architecture
- [ ] Document removed code and reasons
- [ ] Add linting rules to prevent duplicates
- [ ] Set up automated unused code detection


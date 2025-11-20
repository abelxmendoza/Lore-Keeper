# Security Test Runner

## Quick Commands

### Run All Security Tests

```bash
# Backend unit + integration tests
cd apps/server
npm test middleware/ integration/privacy.test.ts

# Frontend E2E tests (requires servers running)
cd apps/web
npm run test:e2e security.spec.ts
```

### Run Specific Test Suites

```bash
# CSRF tests only
cd apps/server && npm test middleware/csrf.test.ts

# Rate limiting tests only
cd apps/server && npm test middleware/rateLimit.test.ts

# Request validation tests only
cd apps/server && npm test middleware/requestValidation.test.ts

# Secure headers tests only
cd apps/server && npm test middleware/secureHeaders.test.ts

# Privacy API tests only
cd apps/server && npm test integration/privacy.test.ts

# E2E security tests only
cd apps/web && npm run test:e2e security.spec.ts
```

## Test Files Summary

✅ **6 Test Files Created:**

1. `apps/server/tests/middleware/csrf.test.ts` - 12+ tests
2. `apps/server/tests/middleware/rateLimit.test.ts` - 7+ tests
3. `apps/server/tests/middleware/requestValidation.test.ts` - 10+ tests
4. `apps/server/tests/middleware/secureHeaders.test.ts` - 8+ tests
5. `apps/server/tests/integration/privacy.test.ts` - 8+ tests
6. `apps/web/e2e/security.spec.ts` - 12+ tests

**Total: 57+ test cases**

## Prerequisites

- Node.js 18+ (check with `node --version`)
- All dependencies installed (`npm install` in both apps/server and apps/web)

## Status

✅ **All tests created and ready to run!**

Once Node.js is upgraded to 18+, run:
```bash
cd apps/server && npm test
```


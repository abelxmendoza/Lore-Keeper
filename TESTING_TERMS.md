# Testing Terms Acceptance

## Quick Test Checklist

### 1. Backend Server Running
```bash
# Check if running
lsof -ti:4000

# If not, start it:
pnpm run dev:server
```

### 2. Open Browser Developer Tools
- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
- Go to **Console** tab
- Go to **Network** tab (to see API calls)

### 3. What to Look For

**In Console:**
- ✅ Should see: `[Supabase Config Debug]` - confirms Supabase is connected
- ✅ Should see: `Failed to check terms status` initially (if table check fails)
- ✅ Should see: `Defaulting to terms not accepted due to error` (if backend not running)
- ✅ After backend starts: Should see successful API calls

**In Network Tab:**
- Look for: `GET /api/user/terms-status` 
  - Status should be `200` (success) or `500` (if table doesn't exist)
- Look for: `POST /api/user/accept-terms`
  - Should be `200` when you accept

### 4. Expected Behavior

**If terms NOT accepted:**
- Terms of Service modal should appear
- Must scroll to bottom
- Must check the checkbox
- Click "Accept and Continue"

**If terms already accepted:**
- App should load normally
- No modal should appear

### 5. Test Steps

1. **Clear browser cache/localStorage** (optional):
   ```javascript
   // In browser console:
   localStorage.clear();
   location.reload();
   ```

2. **Check terms status**:
   ```javascript
   // In browser console:
   fetch('http://localhost:4000/api/user/terms-status')
     .then(r => r.json())
     .then(console.log);
   ```

3. **Accept terms** (if needed):
   - Scroll to bottom of terms
   - Check the checkbox
   - Click "Accept and Continue"
   - Should see success message

4. **Verify acceptance**:
   ```javascript
   // In browser console:
   fetch('http://localhost:4000/api/user/terms-status')
     .then(r => r.json())
     .then(console.log);
   // Should show: { accepted: true, acceptedAt: "...", version: "1.0" }
   ```

### 6. Common Issues

**"Cannot connect to backend server"**
- Backend not running: `pnpm run dev:server`

**"Table does not exist"**
- Run migration in SQL Editor (already done!)

**"Failed to accept terms"**
- Check Network tab for error details
- Check backend logs: `tail -f /tmp/server.log`

**Terms modal doesn't appear**
- Check console for errors
- Verify `termsStatus.accepted` is `false`
- Check if `termsLoading` is stuck on `true`


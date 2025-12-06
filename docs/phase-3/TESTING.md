# Phase 3: Chrome Extension - Testing Guide

## Table of Contents
1. [Testing Overview](#testing-overview)
2. [Prerequisites](#prerequisites)
3. [Test Environment Setup](#test-environment-setup)
4. [Unit Testing (Manual)](#unit-testing-manual)
5. [Integration Testing](#integration-testing)
6. [End-to-End Testing](#end-to-end-testing)
7. [Test Scenarios](#test-scenarios)
8. [Troubleshooting Tests](#troubleshooting-tests)
9. [Performance Testing](#performance-testing)
10. [LinkedIn Safety Guidelines](#linkedin-safety-guidelines)

---

## Testing Overview

### Testing Strategy

This phase focuses on **manual testing** with clear test cases and expected results.

**Test Levels**:
1. **Unit Tests** - Individual functions (storage, API calls)
2. **Integration Tests** - Component interactions (popup ↔ content script)
3. **E2E Tests** - Complete user flows (login → extract → verify)

**Testing Tools**:
- Chrome DevTools Console
- Network Inspector
- Extension DevTools
- Postman (for backend verification)
- MySQL Workbench (for database verification)

---

## Prerequisites

### Before Testing

Ensure the following are ready:

- ✅ **Backend running**: `php artisan serve` at `http://localhost:8000`
- ✅ **Database ready**: All migrations run
- ✅ **User account**: Registered via Phase 1 endpoints
- ✅ **Extension loaded**: Installed at `chrome://extensions/`
- ✅ **LinkedIn account**: Personal LinkedIn account for testing
- ✅ **Test search**: A LinkedIn search URL ready to use

### Recommended Test LinkedIn Search

Use a generic search to avoid bias:

```
https://www.linkedin.com/search/results/people/?keywords=software%20engineer&origin=SWITCH_SEARCH_VERTICAL
```

This should return plenty of results for testing.

---

## Test Environment Setup

### 1. Start Backend Server

```bash
# Terminal 1: Start Laravel
cd C:\Users\a2z\linkedin-automation\backend
php artisan serve

# Should output:
# Starting Laravel development server: http://127.0.0.1:8000
```

### 2. Verify Database Connection

```bash
# Terminal 2: Check database
cd C:\Users\a2z\linkedin-automation\backend
php artisan db:show

# Should show:
# MySQL 8.x
# Database: linkedin_automation
```

### 3. Clear Test Data (Optional)

If you want fresh data:

```bash
# WARNING: Deletes all prospects!
php artisan db:seed --class=ClearProspectsSeeder

# Or manually in MySQL:
# TRUNCATE TABLE prospects;
# TRUNCATE TABLE prospect_tag;
```

### 4. Open Chrome DevTools

1. Load LinkedIn page
2. Press **F12**
3. Keep DevTools open during testing
4. Watch Console for logs

### 5. Open Extension DevTools

**For Service Worker**:
1. Go to `chrome://extensions/`
2. Find "LinkedIn Automation"
3. Click "service worker" link
4. Opens DevTools for background.js

**For Popup**:
1. Right-click extension icon
2. Select "Inspect popup"
3. Opens DevTools for popup.html

---

## Unit Testing (Manual)

### Test 1: Storage Service

**Test**: Storage read/write operations

**Steps**:
1. Open extension service worker console (`chrome://extensions/` → service worker)
2. Run the following tests:

```javascript
// Test 1: Set and get auth token
await setAuthToken('test_token_12345');
const token = await getAuthToken();
console.log('Token:', token); // Should be 'test_token_12345'

// Test 2: Set and get user email
await setUserEmail('test@example.com');
const email = await getUserEmail();
console.log('Email:', email); // Should be 'test@example.com'

// Test 3: Get API URL (should return default)
const apiUrl = await getApiUrl();
console.log('API URL:', apiUrl); // Should be 'http://localhost:8000/api'

// Test 4: Set and get extraction limit
await setExtractionLimit(50);
const limit = await getExtractionLimit();
console.log('Limit:', limit); // Should be 50

// Test 5: Clear auth
await clearAuth();
const clearedToken = await getAuthToken();
const clearedEmail = await getUserEmail();
console.log('After clear - Token:', clearedToken); // Should be null
console.log('After clear - Email:', clearedEmail); // Should be null

// Test 6: View all storage
chrome.storage.local.get(null, data => console.log('All storage:', data));
```

**Expected Results**:
- All values set and retrieved correctly
- `clearAuth()` removes token and email
- Other values persist

**Pass Criteria**: ✅ All console.log outputs match expected values

---

### Test 2: API Service

**Test**: Backend communication

**Prerequisite**: Set a valid auth token from Phase 1 login

**Steps**:

```javascript
// Assume you have a valid token from login
// If not, login first (see Test 3)

// Test 1: Get user info
const user = await getUser();
console.log('User:', user);
// Expected: {data: {id, name, email, created_at, ...}}

// Test 2: Get prospect stats
const stats = await getProspectStats();
console.log('Stats:', stats);
// Expected: {data: {total, not_connected, pending, connected}}

// Test 3: Test error handling (invalid endpoint)
try {
  await apiCall('/invalid-endpoint', 'GET');
} catch (error) {
  console.log('Error caught correctly:', error.message);
  console.log('Status code:', error.status); // Should be 404
}
```

**Expected Results**:
- Valid endpoints return data
- Invalid endpoints throw errors with status codes
- Errors are caught and logged

**Pass Criteria**: ✅ All API calls work as expected

---

### Test 3: Auth Service

**Test**: Login, logout, authentication check

**Steps**:

```javascript
// Test 1: Check not authenticated (before login)
const authBefore = await isAuthenticated();
console.log('Authenticated before login:', authBefore); // Should be false

// Test 2: Login
const user = await handleLogin('your@email.com', 'your_password');
console.log('Logged in user:', user);
// Expected: {id, name, email, ...}

// Test 3: Check authenticated (after login)
const authAfter = await isAuthenticated();
console.log('Authenticated after login:', authAfter); // Should be true

// Test 4: Get current user
const currentUser = await getCurrentUser();
console.log('Current user:', currentUser);
// Expected: Same user object

// Test 5: Get stored email
const storedEmail = await getStoredUserEmail();
console.log('Stored email:', storedEmail); // Should match login email

// Test 6: Logout
await handleLogout();

// Test 7: Check authenticated (after logout)
const authAfterLogout = await isAuthenticated();
console.log('Authenticated after logout:', authAfterLogout); // Should be false
```

**Expected Results**:
- Login stores token and email
- `isAuthenticated()` validates token
- Logout clears token and email

**Pass Criteria**: ✅ Authentication flow works correctly

---

### Test 4: LinkedIn Selectors

**Test**: Verify selectors match LinkedIn DOM

**Prerequisite**: Navigate to LinkedIn search results page

**Steps**:

```javascript
// In LinkedIn page console (F12 on linkedin.com/search/results/people)

// Test 1: Check selectors object exists
console.log('Selectors loaded:', typeof window.LINKEDIN_SELECTORS !== 'undefined');
// Expected: true

// Test 2: Find results container
const container = document.querySelector(LINKEDIN_SELECTORS.SEARCH.RESULTS_CONTAINER);
console.log('Results container found:', container !== null);

// Test 3: Find profile cards
const cards = document.querySelectorAll(LINKEDIN_SELECTORS.SEARCH.PROFILE_CARD);
console.log('Profile cards found:', cards.length);
// Expected: 10+ cards

// Test 4: Extract from first card
const firstCard = cards[0];
const nameEl = firstCard.querySelector(LINKEDIN_SELECTORS.SEARCH.PROFILE_NAME);
const linkEl = firstCard.querySelector(LINKEDIN_SELECTORS.SEARCH.PROFILE_LINK);
console.log('First profile name:', nameEl ? nameEl.textContent : 'NOT FOUND');
console.log('First profile link:', linkEl ? linkEl.href : 'NOT FOUND');

// Test 5: Check all required selectors
const requiredSelectors = [
  'PROFILE_CARD',
  'PROFILE_NAME',
  'PROFILE_LINK',
  'HEADLINE',
  'LOCATION'
];

requiredSelectors.forEach(key => {
  const selector = LINKEDIN_SELECTORS.SEARCH[key];
  const found = firstCard.querySelector(selector);
  console.log(`${key}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
});
```

**Expected Results**:
- Selectors object is defined
- All required selectors find elements
- Data can be extracted from cards

**Pass Criteria**: ✅ All required selectors return elements

**If selectors fail**: LinkedIn changed their DOM. Update `utils/selectors.js` (see CODE_GUIDE.md).

---

### Test 5: Extractor Service

**Test**: Extraction logic without backend

**Prerequisite**: Navigate to LinkedIn search results with 10+ results

**Steps**:

```javascript
// In LinkedIn page console

// Test 1: Check extractor is loaded
console.log('Extractor loaded:', typeof performExtraction === 'function');

// Test 2: Extract 5 profiles
const prospects = await performExtraction(5);
console.log('Extracted prospects:', prospects.length);
console.log('Prospects:', prospects);

// Test 3: Verify prospect structure
const firstProspect = prospects[0];
const requiredFields = ['full_name', 'profile_url', 'linkedin_id'];
const hasAllFields = requiredFields.every(field => firstProspect[field]);
console.log('Has all required fields:', hasAllFields);

// Test 4: Verify LinkedIn ID extraction
console.log('Sample LinkedIn ID:', firstProspect.linkedin_id);
// Expected: Something like "john-doe-123456"

// Test 5: Verify company extraction from headline
const withCompany = prospects.find(p => p.company);
console.log('Company extracted:', withCompany ? withCompany.company : 'NONE');
```

**Expected Results**:
- Extraction completes without errors
- Returns correct number of prospects
- Each prospect has required fields
- LinkedIn ID is extracted from URL
- Company is parsed from headline (if available)

**Pass Criteria**: ✅ Extraction returns valid prospect objects

---

## Integration Testing

### Test 6: Popup ↔ Content Script Communication

**Test**: Message passing between popup and content script

**Prerequisite**: LinkedIn search results page open

**Steps**:

1. **Open popup** (click extension icon)

2. **Open popup DevTools**:
   - Right-click extension icon
   - "Inspect popup"

3. **In popup console**:
   ```javascript
   // Manually trigger extraction
   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

   chrome.tabs.sendMessage(tab.id, {
     type: 'START_EXTRACTION',
     limit: 5
   }, (response) => {
     console.log('Response from content script:', response);
   });
   ```

4. **Check LinkedIn page console** (F12 on LinkedIn tab):
   ```
   Expected logs:
   [Content Script] Received message: START_EXTRACTION
   [Content Script] Starting extraction with limit: 5
   [Extractor] Starting extraction...
   [Content Script] Extraction complete: 5 prospects
   ```

5. **Check popup console**:
   ```
   Expected response:
   {
     success: true,
     prospects: [...5 prospects...],
     count: 5
   }
   ```

**Expected Results**:
- Popup sends message successfully
- Content script receives message
- Extractor runs on LinkedIn page
- Content script returns prospects to popup

**Pass Criteria**: ✅ Message passes both ways without errors

---

### Test 7: Popup → API → Database

**Test**: Complete data flow from extraction to database

**Steps**:

1. **Clear existing data** (optional):
   ```sql
   -- In MySQL Workbench
   DELETE FROM prospects WHERE linkedin_id LIKE 'test-%';
   ```

2. **Open popup** and click "Extract Prospects"

3. **Watch popup console** for logs

4. **Watch network requests**:
   - In popup DevTools → Network tab
   - Should see POST to `/api/prospects/bulk`

5. **Verify response**:
   ```javascript
   // Expected response in Network tab:
   {
     "success": true,
     "data": {
       "created": 5,
       "skipped": 0,
       "total": 5
     }
   }
   ```

6. **Verify database**:
   ```sql
   -- In MySQL Workbench
   SELECT COUNT(*) FROM prospects;
   SELECT * FROM prospects ORDER BY created_at DESC LIMIT 5;
   ```

**Expected Results**:
- Prospects extracted from LinkedIn
- Sent to backend via API
- Saved to database
- Duplicates skipped on re-extraction

**Pass Criteria**: ✅ Prospects appear in database

---

## End-to-End Testing

### Test 8: Complete User Flow - First Time Setup

**Scenario**: New user installs extension and extracts prospects

**Steps**:

1. **Remove extension**:
   - Go to `chrome://extensions/`
   - Click "Remove" on LinkedIn Automation

2. **Reload extension**:
   - Click "Load unpacked"
   - Select `extension` folder

3. **Verify options page opens automatically**:
   - Should open on first install
   - Shows login form

4. **Login**:
   - Enter email and password
   - Click "Login"
   - Should show success message
   - Should switch to settings view

5. **Verify settings saved**:
   - API URL should be `http://localhost:8000/api`
   - Extraction limit should be 100

6. **Navigate to LinkedIn**:
   - Go to `https://www.linkedin.com/search/results/people/?keywords=engineer`

7. **Open popup**:
   - Click extension icon
   - Should show extraction UI (not login prompt)
   - Should display user email

8. **Extract prospects**:
   - Enter limit: 10
   - Click "Extract Prospects"
   - Watch progress bar update

9. **Verify success message**:
   - Should show "Success! Imported X new prospects"

10. **Verify in database**:
    ```sql
    SELECT COUNT(*) FROM prospects WHERE user_id = YOUR_USER_ID;
    ```

**Expected Results**:
- ✅ Options opens on install
- ✅ Login works
- ✅ Settings saved
- ✅ Extraction UI appears
- ✅ Extraction completes
- ✅ Data saved to database

**Pass Criteria**: All steps complete without errors

---

### Test 9: Complete User Flow - Returning User

**Scenario**: User who is already logged in extracts more prospects

**Steps**:

1. **Ensure user is logged in**:
   - Open options page
   - Should show settings (not login form)

2. **Navigate to LinkedIn search**:
   - Different search than before
   - Example: `keywords=marketing`

3. **Open popup**:
   - Click extension icon
   - Should show extraction UI immediately

4. **Extract prospects**:
   - Enter limit: 20
   - Click "Extract Prospects"

5. **Watch progress**:
   - Progress bar should update
   - Current count should increase

6. **Verify result**:
   - Success message appears
   - Shows created vs skipped count

7. **Extract same search again**:
   - Click "Extract Prospects" again
   - Should skip duplicates

8. **Verify duplicate handling**:
   - Message: "Imported 0 new, skipped 20 duplicates"

**Expected Results**:
- ✅ Already authenticated
- ✅ New prospects saved
- ✅ Duplicates skipped on re-extraction

**Pass Criteria**: All extractions work, duplicates handled

---

### Test 10: Logout and Re-login

**Scenario**: User logs out and logs back in

**Steps**:

1. **Open popup**:
   - Verify user email is shown

2. **Click "Logout"**:
   - Should show success message

3. **Close and reopen popup**:
   - Should now show "Please login in Settings" message

4. **Try to extract** (should fail):
   - Open LinkedIn search page
   - Open popup
   - Should not show extract button

5. **Open options page**:
   - Should show login form (not settings)

6. **Login again**:
   - Enter credentials
   - Click "Login"

7. **Reopen popup**:
   - Should show extraction UI again

8. **Extract prospects**:
   - Should work normally

**Expected Results**:
- ✅ Logout clears session
- ✅ Extraction UI hidden when logged out
- ✅ Re-login restores functionality

**Pass Criteria**: Logout/login cycle works correctly

---

## Test Scenarios

### Scenario 1: No Search Results

**Setup**: Navigate to LinkedIn search with 0 results

**Example URL**:
```
https://www.linkedin.com/search/results/people/?keywords=qwertyuiopasdfghjklzxcvbnm
```

**Steps**:
1. Open popup
2. Click "Extract Prospects"

**Expected Result**:
- Extraction completes
- Message: "Success! Imported 0 prospects"

**Pass Criteria**: ✅ No errors, handles 0 results gracefully

---

### Scenario 2: Limit Exceeds Available Results

**Setup**: Search with only 5 results

**Steps**:
1. Open popup
2. Set limit to 100
3. Click "Extract Prospects"

**Expected Result**:
- Extracts all 5 available results
- Stops at 5 (doesn't wait for more)
- Message: "Success! Imported 5 new prospects"

**Pass Criteria**: ✅ Extracts only available results, doesn't hang

---

### Scenario 3: Slow LinkedIn Page

**Setup**: Throttle network in DevTools

**Steps**:
1. Open LinkedIn page DevTools
2. Network tab → Throttling → Slow 3G
3. Open popup
4. Extract prospects with limit 10

**Expected Result**:
- Scrolling takes longer (more attempts)
- Extraction still completes
- All 10 prospects extracted

**Pass Criteria**: ✅ Works on slow connections

---

### Scenario 4: Popup Closed During Extraction

**Setup**: Normal LinkedIn search

**Steps**:
1. Open popup
2. Click "Extract Prospects" (limit 20)
3. **Immediately close popup** (click outside)
4. Wait 10 seconds
5. Reopen popup

**Expected Result**:
- Extraction continues in background (content script still runs)
- Popup shows stale state (no progress updates)
- But extraction completes
- Check database - 20 prospects should be saved

**Note**: Progress updates fail when popup closes, but extraction itself completes.

**Pass Criteria**: ✅ Extraction completes even if popup closes

---

### Scenario 5: Invalid API URL

**Setup**: Configure wrong API URL

**Steps**:
1. Open options page
2. Change API URL to `http://localhost:9999/api`
3. Save
4. Try to extract prospects

**Expected Result**:
- Extraction completes on LinkedIn
- Backend import fails
- Error message: "Network error: Unable to reach the server"

**Pass Criteria**: ✅ Shows helpful error message

---

### Scenario 6: Expired Token

**Setup**: Manually expire token in database

**Steps**:
1. Login normally
2. In MySQL, delete token:
   ```sql
   DELETE FROM personal_access_tokens WHERE tokenable_id = YOUR_USER_ID;
   ```
3. Try to extract prospects

**Expected Result**:
- Extraction completes
- Backend rejects request with 401
- Error message: "Unauthorized" or "Token expired"
- (Future enhancement: Auto-redirect to login)

**Pass Criteria**: ✅ Handles 401 errors

---

### Scenario 7: Very Large Extraction

**Setup**: LinkedIn search with 100+ results

**Steps**:
1. Set limit to 100
2. Extract prospects
3. Watch scrolling behavior

**Expected Result**:
- Auto-scroll loads all results
- Stops scrolling when no new content
- Extracts exactly 100 prospects
- Takes 1-2 minutes (depending on LinkedIn load time)

**Pass Criteria**: ✅ Handles large extractions without timeout

---

## Troubleshooting Tests

### Test Fails: Selectors Not Found

**Symptoms**:
- Extraction returns 0 prospects
- Console: "NOT FOUND" for selectors

**Diagnosis**:
```javascript
// In LinkedIn page console
const cards = document.querySelectorAll('.reusable-search__result-container');
console.log('Cards:', cards.length);

// If 0, LinkedIn changed their structure
```

**Fix**:
1. Inspect LinkedIn page
2. Find new class names
3. Update `utils/selectors.js`
4. Reload extension

---

### Test Fails: CORS Error

**Symptoms**:
- Console error: "has been blocked by CORS policy"

**Diagnosis**:
```javascript
// In popup DevTools console
fetch('http://localhost:8000/api/user')
  .then(r => console.log('Success'))
  .catch(e => console.log('CORS error:', e));
```

**Fix**:
```php
// Laravel: config/cors.php
'allowed_origins' => ['*'],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
```

Then restart Laravel server.

---

### Test Fails: Content Script Not Injected

**Symptoms**:
- Error: "Content script not loaded"
- No console logs on LinkedIn page

**Diagnosis**:
```javascript
// In LinkedIn page console
console.log(typeof performExtraction); // Should be 'function'
```

**Fix**:
1. Refresh LinkedIn page (F5)
2. If still fails, reload extension
3. Check manifest.json content_scripts are correct

---

## Performance Testing

### Test 11: Extraction Speed

**Metric**: Time to extract 50 prospects

**Steps**:
1. Open LinkedIn search with 100+ results
2. Open popup
3. **Start timer**
4. Set limit to 50
5. Click "Extract Prospects"
6. **Stop timer** when success message appears

**Expected Results**:
- **Scrolling**: 10-30 seconds (depends on LinkedIn)
- **Extraction**: 5-10 seconds
- **Backend import**: 2-5 seconds
- **Total**: 20-45 seconds for 50 prospects

**Pass Criteria**: ✅ Completes in under 60 seconds

---

### Test 12: Memory Usage

**Metric**: Extension memory usage

**Steps**:
1. Go to `chrome://extensions/`
2. Find "LinkedIn Automation"
3. Note "Service worker" status (inactive is normal)
4. Extract 100 prospects
5. Check memory in Task Manager:
   - Chrome → Shift+Esc → Task Manager
   - Find "Extension: LinkedIn Automation"

**Expected Results**:
- Service worker activates during extraction
- Memory: 10-50 MB (typical for extension)
- Deactivates after extraction completes

**Pass Criteria**: ✅ Memory usage reasonable, no leaks

---

## LinkedIn Safety Guidelines

### Important: Avoid LinkedIn Bans

**DO**:
- ✅ Limit extractions to 50-100 per session
- ✅ Wait 5-10 minutes between extractions
- ✅ Use during normal hours (9 AM - 6 PM)
- ✅ Test with generic searches (not targeted)

**DON'T**:
- ❌ Extract 1000+ prospects in one day
- ❌ Run multiple extractions back-to-back
- ❌ Use during late night (suspicious)
- ❌ Extract the same search repeatedly

**Recommended Testing Pattern**:
```
Day 1: Extract 20 prospects (test search)
        Wait 1 hour
        Extract 30 prospects (different search)

Day 2: Extract 50 prospects

Day 3: Extract 100 prospects
```

### Signs of LinkedIn Rate Limiting

If you see:
- "Too many requests" errors
- Search results not loading
- Forced logout from LinkedIn
- CAPTCHA challenges

**Action**: Stop testing immediately, wait 24 hours before resuming.

---

## Test Checklist

Use this checklist before marking Phase 3 complete:

### Unit Tests
- [ ] Storage: Set/get all keys
- [ ] Storage: Clear auth
- [ ] API: Login endpoint
- [ ] API: Get user endpoint
- [ ] API: Error handling
- [ ] Auth: Login flow
- [ ] Auth: Logout flow
- [ ] Auth: isAuthenticated validation
- [ ] Selectors: All required selectors found
- [ ] Extractor: Extract 5 profiles

### Integration Tests
- [ ] Popup → Content Script message
- [ ] Content Script → Popup response
- [ ] Extraction → API → Database flow
- [ ] Progress updates work

### E2E Tests
- [ ] First time setup (install → login → extract)
- [ ] Returning user (extract directly)
- [ ] Logout and re-login
- [ ] Duplicate handling

### Edge Cases
- [ ] 0 search results
- [ ] Limit exceeds available results
- [ ] Slow network
- [ ] Popup closed during extraction
- [ ] Invalid API URL
- [ ] Expired token

### Performance
- [ ] 50 prospects in under 60 seconds
- [ ] Memory usage reasonable
- [ ] No browser crashes

### Safety
- [ ] Tested with small limits (10-20)
- [ ] No LinkedIn warnings
- [ ] No rate limiting

---

## Next Steps

After all tests pass:

1. **Document any issues** found during testing
2. **Update CLAUDE.md** to mark Phase 3 complete
3. **Prepare Phase 3 summary** for user approval
4. **Plan Phase 4** (React Dashboard) based on learnings

---

## Test Results Template

Use this template to record test results:

```
## Phase 3 Testing - [Date]

### Environment
- Chrome Version:
- Laravel Version: 11
- MySQL Version: 8.x
- Extension Version: 1.0.0

### Unit Tests
✅ Storage Service - PASS
✅ API Service - PASS
✅ Auth Service - PASS
✅ Selectors - PASS
✅ Extractor - PASS

### Integration Tests
✅ Popup ↔ Content Script - PASS
✅ Popup → API → Database - PASS

### E2E Tests
✅ First Time Setup - PASS
✅ Returning User - PASS
✅ Logout/Re-login - PASS

### Edge Cases
✅ 0 Results - PASS
✅ Limit Exceeds Results - PASS
✅ Slow Network - PASS
✅ Popup Closed - PASS
✅ Invalid API URL - PASS
✅ Expired Token - PASS

### Performance
✅ 50 prospects extracted in 35 seconds
✅ Memory usage: 25 MB

### Issues Found
- None

### Overall Result
✅ PHASE 3 COMPLETE - All tests passing
```

---

**Phase 3 Testing Guide Complete!**

You now have comprehensive test scenarios to validate the Chrome extension.

Run through these tests and document results before seeking approval for Phase 4.

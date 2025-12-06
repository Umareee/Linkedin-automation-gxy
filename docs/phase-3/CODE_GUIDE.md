# Phase 3: Chrome Extension - Code Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Manifest V3 Structure](#manifest-v3-structure)
3. [Component Breakdown](#component-breakdown)
4. [Data Flow](#data-flow)
5. [Service Layer](#service-layer)
6. [Content Script Injection](#content-script-injection)
7. [LinkedIn Selectors](#linkedin-selectors)
8. [Message Passing](#message-passing)
9. [Storage Management](#storage-management)
10. [Error Handling](#error-handling)
11. [Security Considerations](#security-considerations)
12. [Extending the Extension](#extending-the-extension)

---

## Architecture Overview

The Chrome extension follows a **Manifest V3 architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                  Chrome Extension                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────┐      ┌──────────────┐             │
│  │   Popup     │◄────►│   Options    │             │
│  │  (UI Layer) │      │  (Settings)  │             │
│  └──────┬──────┘      └──────┬───────┘             │
│         │                    │                      │
│         │     ┌──────────────▼───────┐             │
│         │     │  Background Worker   │             │
│         │     │  (Service Worker)    │             │
│         │     └──────────────────────┘             │
│         │                                           │
│         │     ┌─────────────────────────┐          │
│         └────►│   Services Layer        │          │
│               │  - API (Backend)        │          │
│               │  - Auth                 │          │
│               │  - Storage              │          │
│               │  - Extractor            │          │
│               └──────────┬──────────────┘          │
│                          │                         │
│  ┌───────────────────────▼──────────────────────┐ │
│  │         Content Script                       │ │
│  │  (Injected into LinkedIn pages)              │ │
│  │  - Extractor.js (DOM scraping)               │ │
│  │  - Selectors.js (CSS selectors)              │ │
│  └──────────────────────────────────────────────┘ │
│                          │                         │
└──────────────────────────┼─────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   LinkedIn.com Page    │
              │   (DOM Manipulation)   │
              └────────────────────────┘
                           │
                           │  HTTP Requests
                           ▼
              ┌────────────────────────┐
              │   Laravel Backend API  │
              │   (Phase 1 & 2)        │
              └────────────────────────┘
```

### Key Principles

1. **Separation of Concerns**: Each file has a single responsibility
2. **Service Layer**: All backend communication goes through API service
3. **Message Passing**: Popup ↔ Content Script communication via Chrome APIs
4. **Storage Abstraction**: Chrome storage wrapped in helper functions
5. **Error Handling**: Try-catch blocks with user-friendly error messages

---

## Manifest V3 Structure

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "LinkedIn Automation",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://www.linkedin.com/*",
    "http://localhost:8000/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.linkedin.com/*"],
      "js": ["utils/selectors.js", "services/extractor.js", "content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "options_page": "options.html"
}
```

### Key Differences from Manifest V2

| Aspect | Manifest V2 | Manifest V3 (Our Choice) |
|--------|-------------|--------------------------|
| Background | Persistent page | Service worker (event-driven) |
| Host permissions | Part of `permissions` | Separate `host_permissions` |
| Content security | Inline scripts allowed | No inline scripts (CSP strict) |
| API namespace | `chrome.*` | `chrome.*` (promises preferred) |

**Why Manifest V3?**
- Google requires it for new extensions (V2 deprecated)
- Better security (stricter CSP)
- Better performance (service workers are lighter)
- Future-proof

---

## Component Breakdown

### 1. Background Service Worker (background.js)

**Purpose**: Event-driven coordinator for extension lifecycle

**Key Features**:
- Listens for extension install/update events
- Routes messages between components
- Enables extension icon on LinkedIn pages
- Handles errors and health checks

**Important Code**:

```javascript
// Open options page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

// Enable icon only on LinkedIn pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('linkedin.com')) {
    chrome.action.enable(tabId);
  }
});
```

**When it runs**: Only when events occur (not persistent)

**Location**: `extension/background.js` (93 lines)

---

### 2. Popup (popup.html + popup.js + popup.css)

**Purpose**: Main user interface for extraction

**UI States**:
1. **Not Logged In**: Shows "Please login" message with link to options
2. **Logged In**: Shows extraction controls
3. **Extracting**: Shows progress bar
4. **Complete**: Shows success/error message with stats

**Key Features**:
- Display user email
- Extraction limit input (1-100)
- Extract button (triggers content script)
- Real-time progress bar
- Success/error messages
- Logout button

**Important Code**:

```javascript
// Send extraction request to content script
chrome.tabs.sendMessage(tab.id, {
  type: 'START_EXTRACTION',
  limit: limit
}, async (response) => {
  if (response.success) {
    // Send prospects to backend
    const result = await bulkImportProspects(response.prospects);
    showStatus(`Success! Imported ${result.created} prospects`);
  }
});
```

**Data Flow**:
1. User clicks "Extract Prospects"
2. Popup sends message to content script
3. Content script extracts data from LinkedIn
4. Content script sends data back to popup
5. Popup sends data to backend API
6. Popup shows result to user

**Location**:
- HTML: `extension/popup.html` (80 lines)
- JS: `extension/popup.js` (276 lines)
- CSS: `extension/popup.css` (styling)

---

### 3. Options Page (options.html + options.js + options.css)

**Purpose**: Settings and authentication

**Features**:
- **Login Form**: Email + password authentication
- **Settings Panel** (after login):
  - API Base URL configuration
  - Default extraction limit
  - Logout button
  - Current user display

**Important Code**:

```javascript
// Handle login
async function handleLoginSubmit(event) {
  event.preventDefault();

  const user = await handleLogin(email, password);
  // Token is automatically stored by auth service

  showMessage('Login successful!', 'success');
  showSettingsSection();
}

// Save API URL
async function handleSaveApiUrl() {
  await setApiUrl(apiUrl);
  showMessage('API URL saved successfully', 'success');
}
```

**When it opens**:
- Automatically on first install
- Click "Settings" link in popup
- Right-click extension icon → Options

**Location**:
- HTML: `extension/options.html` (90 lines)
- JS: `extension/options.js` (256 lines)
- CSS: `extension/options.css` (styling)

---

### 4. Content Script (content-script.js)

**Purpose**: Bridge between popup and LinkedIn page DOM

**Runs on**: All `linkedin.com/*` pages

**Key Features**:
- Listens for extraction requests from popup
- Validates page is search results page
- Calls extractor service to scrape DOM
- Returns extracted data back to popup
- Handles errors gracefully

**Important Code**:

```javascript
// Listen for extraction requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_EXTRACTION') {
    handleExtraction(message.limit)
      .then(sendResponse)
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Async response
  }
});

// Validate page type
function isSearchResultsPage() {
  return window.location.href.includes('linkedin.com/search/results/people');
}
```

**Injected Files** (in order):
1. `utils/selectors.js` - LinkedIn CSS selectors
2. `services/extractor.js` - DOM scraping logic
3. `content-script.js` - Message handler

**Location**: `extension/content-script.js` (123 lines)

---

## Service Layer

### 1. API Service (services/api.js)

**Purpose**: All HTTP communication with Laravel backend

**Pattern**: Centralized API caller with authentication

**Key Functions**:

```javascript
// Generic API caller with auth token
async function apiCall(endpoint, method = 'GET', body = null)

// Authentication endpoints
async function login(email, password)
async function logout()
async function getUser()

// Prospect endpoints
async function bulkImportProspects(prospects)
async function getProspectStats()
async function getProspects(page, perPage)
async function getProspect(id)
async function deleteProspect(id)
```

**Important Features**:
- Automatically adds `Authorization: Bearer {token}` header
- Gets API URL and token from storage
- Parses JSON responses
- Throws errors with status codes
- Handles network errors

**Error Handling**:

```javascript
if (!response.ok) {
  const error = new Error(data.message || 'API request failed');
  error.status = response.status;
  error.errors = data.errors || {};
  throw error;
}
```

**Location**: `extension/services/api.js` (134 lines)

---

### 2. Auth Service (services/auth.js)

**Purpose**: Manages authentication state

**Key Functions**:

```javascript
// Check if user is authenticated (validates token)
async function isAuthenticated()

// Login and store token
async function handleLogin(email, password)

// Logout and clear token
async function handleLogout()

// Get current user
async function getCurrentUser()

// Get stored email
async function getStoredUserEmail()
```

**Authentication Flow**:

```
1. User enters email/password in options.html
2. handleLogin() calls API service login()
3. Backend returns {user, token}
4. Token stored in Chrome storage
5. Email stored in Chrome storage
6. isAuthenticated() validates token on every page load
```

**Token Validation**:

```javascript
async function isAuthenticated() {
  const token = await getAuthToken();
  if (!token) return false;

  // Verify token is still valid
  try {
    await getUser(); // Calls /api/user endpoint
    return true;
  } catch (error) {
    await clearAuth(); // Token expired
    return false;
  }
}
```

**Location**: `extension/services/auth.js` (100 lines)

---

### 3. Storage Service (services/storage.js)

**Purpose**: Wrapper for Chrome Storage API

**Storage Keys**:

```javascript
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_EMAIL: 'user_email',
  API_URL: 'api_url',
  EXTRACTION_LIMIT: 'extraction_limit'
};

const DEFAULTS = {
  API_URL: 'http://localhost:8000/api',
  EXTRACTION_LIMIT: 100
};
```

**Key Functions**:

```javascript
// Auth token
async function getAuthToken()
async function setAuthToken(token)

// User email
async function getUserEmail()
async function setUserEmail(email)

// API URL
async function getApiUrl()
async function setApiUrl(url)

// Extraction limit
async function getExtractionLimit()
async function setExtractionLimit(limit)

// Cleanup
async function clearAuth()      // Remove token + email
async function clearAll()        // Remove everything
```

**Why wrap Chrome Storage?**
- Consistent async/await pattern
- Centralized key management
- Default values
- Type safety (can add validation)
- Easy to mock for testing

**Location**: `extension/services/storage.js` (112 lines)

---

### 4. Extractor Service (services/extractor.js)

**Purpose**: DOM scraping logic for LinkedIn pages

**Key Functions**:

```javascript
// Scroll page to load all lazy-loaded profiles
async function scrollToLoadAll()

// Extract LinkedIn ID from URL
function extractLinkedInId(profileUrl)

// Extract data from a single profile card
function extractProfileFromCard(card, selectors)

// Extract all profiles from current page
async function extractProfiles(limit)

// Main extraction function (public API)
async function performExtraction(limit)
```

**Extraction Process**:

```
1. scrollToLoadAll()
   - Scroll to bottom repeatedly
   - Wait for LinkedIn to load more results
   - Stop when no new content or max attempts

2. extractProfiles(limit)
   - Find all profile cards using selectors
   - Loop through each card
   - Extract data using extractProfileFromCard()
   - Send progress updates to popup
   - Stop when limit reached

3. Return array of prospect objects
```

**Prospect Data Structure**:

```javascript
{
  full_name: "John Doe",
  profile_url: "https://www.linkedin.com/in/john-doe-123456/",
  linkedin_id: "john-doe-123456",
  headline: "Software Engineer at TechCorp",
  location: "San Francisco, CA",
  company: "TechCorp",              // Parsed from headline
  profile_image_url: "https://..."  // Optional
}
```

**Smart Company Extraction**:

```javascript
// Headline: "Software Engineer at TechCorp"
if (headline.includes(' at ')) {
  const parts = headline.split(' at ');
  company = parts[parts.length - 1].trim();
  // company = "TechCorp"
}
```

**Location**: `extension/services/extractor.js` (190 lines)

---

## LinkedIn Selectors

### utils/selectors.js

**Purpose**: Centralized CSS selectors for LinkedIn DOM

**Why separate file?**
- LinkedIn changes their DOM frequently
- Easy to update selectors in one place
- Maintainability
- Documentation

**Structure**:

```javascript
const LINKEDIN_SELECTORS = {
  SEARCH: {
    RESULTS_CONTAINER: '.search-results-container',
    PROFILE_CARD: '.reusable-search__result-container',
    PROFILE_LINK: 'a.app-aware-link[href*="/in/"]',
    PROFILE_NAME: '.entity-result__title-text a span[aria-hidden="true"]',
    PROFILE_NAME_ALT: '.entity-result__title-text .t-roman',
    HEADLINE: '.entity-result__primary-subtitle',
    LOCATION: '.entity-result__secondary-subtitle',
    // ... more selectors
  },
  COMMON: {
    LOADING_SPINNER: '.artdeco-loader',
    NO_RESULTS: '.search-results__no-results',
    ERROR_MESSAGE: '.artdeco-inline-feedback--error'
  }
};
```

**Usage in Extractor**:

```javascript
const selectors = window.LINKEDIN_SELECTORS.SEARCH;
const profileCards = document.querySelectorAll(selectors.PROFILE_CARD);

for (const card of profileCards) {
  const nameEl = card.querySelector(selectors.PROFILE_NAME);
  const linkEl = card.querySelector(selectors.PROFILE_LINK);
  // ...
}
```

**Fallback Pattern**:

```javascript
// Try primary selector
let nameEl = card.querySelector(selectors.PROFILE_NAME);

// If not found, try alternative
if (!nameEl) {
  nameEl = card.querySelector(selectors.PROFILE_NAME_ALT);
}
```

**Updating Selectors**:

When LinkedIn changes their DOM:

1. Open LinkedIn search results page
2. Right-click element → Inspect
3. Find the new class names
4. Update `selectors.js`
5. Reload extension
6. Test extraction

**Location**: `extension/utils/selectors.js` (86 lines)

---

## Data Flow

### Complete Extraction Flow

```
┌─────────────┐
│   User      │
│  (Popup)    │
└──────┬──────┘
       │
       │ 1. Click "Extract Prospects" (limit: 50)
       ▼
┌─────────────────────┐
│   Popup.js          │
│  handleExtractClick │
└──────┬──────────────┘
       │
       │ 2. chrome.tabs.sendMessage({type: 'START_EXTRACTION', limit: 50})
       ▼
┌──────────────────────────┐
│   Content Script         │
│  (LinkedIn page context) │
└──────┬───────────────────┘
       │
       │ 3. handleExtraction(50)
       │    - Check if search results page
       │    - Validate selectors loaded
       ▼
┌──────────────────────┐
│   Extractor Service  │
│  performExtraction() │
└──────┬───────────────┘
       │
       │ 4. scrollToLoadAll()
       │    - Scroll to bottom
       │    - Wait for LinkedIn to load
       │    - Repeat until no new content
       ▼
┌──────────────────────┐
│   Extractor Service  │
│  extractProfiles()   │
└──────┬───────────────┘
       │
       │ 5. For each profile card:
       │    - extractProfileFromCard()
       │    - Send progress update
       │    - Stop at limit
       │
       │ Returns: [{prospect}, {prospect}, ...]
       ▼
┌──────────────────────────┐
│   Content Script         │
│  Returns to popup        │
└──────┬───────────────────┘
       │
       │ 6. sendResponse({success: true, prospects: [...], count: 50})
       ▼
┌─────────────────────┐
│   Popup.js          │
│  Receives response  │
└──────┬──────────────┘
       │
       │ 7. bulkImportProspects(prospects)
       ▼
┌──────────────────┐
│   API Service    │
│  POST /prospects/bulk
└──────┬───────────┘
       │
       │ 8. HTTP Request
       ▼
┌────────────────────┐
│  Laravel Backend   │
│  ProspectController│
│  ::bulkImport()    │
└──────┬─────────────┘
       │
       │ 9. Save to database
       │    - Skip duplicates (by linkedin_id)
       │    - Create new prospects
       │
       │ Returns: {created: 45, skipped: 5, total: 50}
       ▼
┌─────────────────────┐
│   API Service       │
│  Returns response   │
└──────┬──────────────┘
       │
       │ 10. Response
       ▼
┌─────────────────────┐
│   Popup.js          │
│  Show success msg   │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│   User      │
│  Sees:      │
│  "Success!  │
│  Imported   │
│  45 new     │
│  prospects" │
└─────────────┘
```

---

## Message Passing

### Chrome Extension Message Patterns

#### 1. Popup → Content Script

```javascript
// Popup sends message
chrome.tabs.sendMessage(tabId, {
  type: 'START_EXTRACTION',
  limit: 50
}, (response) => {
  console.log(response); // {success: true, prospects: [...]}
});

// Content script listens
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_EXTRACTION') {
    performExtraction(message.limit)
      .then(prospects => sendResponse({success: true, prospects}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true; // IMPORTANT: Indicates async response
  }
});
```

#### 2. Content Script → Popup (Progress Updates)

```javascript
// Content script sends progress
chrome.runtime.sendMessage({
  type: 'EXTRACTION_PROGRESS',
  current: 25,
  limit: 50
});

// Popup listens
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'EXTRACTION_PROGRESS') {
    updateProgress(message.current, message.limit);
  }
});
```

#### 3. Popup → Background → Content Script (Not Used)

In Manifest V3, service workers can't reliably broadcast messages.
Our architecture uses **direct Popup → Content Script** communication.

---

## Storage Management

### Chrome Storage vs LocalStorage

| Feature | Chrome Storage | LocalStorage |
|---------|---------------|--------------|
| Access | All extension contexts | Only same origin |
| Async | Yes (promises) | No (synchronous) |
| Size limit | 5MB (local), 100KB (sync) | 5-10MB |
| Persistence | Survives extension reload | Survives page reload |
| Security | Extension-scoped | Origin-scoped |

**We use Chrome Storage Local** for:
- Auth token (secure, extension-wide)
- User email
- API URL
- Extraction limit

### Storage Patterns

**Get with default**:
```javascript
async function getApiUrl() {
  const result = await chrome.storage.local.get('api_url');
  return result.api_url || 'http://localhost:8000/api';
}
```

**Set value**:
```javascript
async function setAuthToken(token) {
  await chrome.storage.local.set({ auth_token: token });
}
```

**Remove keys**:
```javascript
async function clearAuth() {
  await chrome.storage.local.remove(['auth_token', 'user_email']);
}
```

**Clear all**:
```javascript
async function clearAll() {
  await chrome.storage.local.clear();
}
```

---

## Error Handling

### Patterns Used

#### 1. Try-Catch with User-Friendly Messages

```javascript
async function handleLogin(email, password) {
  try {
    const response = await login(email, password);
    await setAuthToken(response.token);
    return response.user;
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
}
```

#### 2. API Error Enrichment

```javascript
if (!response.ok) {
  const error = new Error(data.message || 'API request failed');
  error.status = response.status;    // 400, 401, 500, etc.
  error.errors = data.errors || {};   // Validation errors
  throw error;
}
```

#### 3. Graceful Degradation

```javascript
// Try primary selector, fallback to alternative
let nameEl = card.querySelector(selectors.PROFILE_NAME);
if (!nameEl) {
  nameEl = card.querySelector(selectors.PROFILE_NAME_ALT);
}

// Skip card if still not found
if (!nameEl) {
  return null;
}
```

#### 4. Silent Failures (Progress Updates)

```javascript
try {
  chrome.runtime.sendMessage({ type: 'EXTRACTION_PROGRESS', current, limit });
} catch (error) {
  // Ignore if popup is closed - don't break extraction
  console.warn('Failed to send progress update:', error);
}
```

### Error Display

**Popup UI**:
```javascript
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = type; // 'success' or 'error'
  statusMessage.classList.remove('hidden');
}

// Usage
showStatus('Login failed: Invalid credentials', 'error');
showStatus('Imported 45 prospects successfully', 'success');
```

---

## Security Considerations

### 1. Token Storage

**Current**: Token stored in Chrome Storage Local
- Encrypted by Chrome on disk
- Only accessible to this extension
- Survives browser restart

**Production Consideration**: Token expiration
- Backend should expire tokens (e.g., 7 days)
- Extension should handle 401 responses
- Auto-logout on token expiration

### 2. CORS Configuration

**Development**:
```php
// Laravel: config/cors.php
'allowed_origins' => ['*'],
```

**Production**:
```php
'allowed_origins' => [
    'chrome-extension://YOUR_EXTENSION_ID'
],
```

Get extension ID: `chrome://extensions/` → Extension details

### 3. Input Validation

**Client-side**:
```javascript
const limit = parseInt(limitInput.value);
if (limit < 1 || limit > 100) {
  showStatus('Please enter a limit between 1 and 100', 'error');
  return;
}
```

**Backend-side** (Laravel):
```php
$validated = $request->validate([
    'prospects.*.full_name' => 'required|string',
    'prospects.*.profile_url' => 'required|url',
]);
```

### 4. Content Security Policy

Manifest V3 enforces strict CSP:
- No inline scripts (`<script>alert('hi')</script>`)
- No `eval()` or `new Function()`
- No inline event handlers (`onclick="..."`)

**All JS must be in separate files**.

### 5. Rate Limiting

**Client-side** (extraction):
- Scroll delay: 1 second between scrolls
- Max 100 prospects per extraction
- User controls extraction frequency

**Backend-side** (recommended):
```php
// Laravel: routes/api.php
Route::middleware('throttle:60,1')->group(function () {
    Route::post('/prospects/bulk', ...);
});
```

---

## Extending the Extension

### Adding a New Feature

Example: Add "Delete Prospect" from popup

#### Step 1: Update API Service

```javascript
// services/api.js
async function deleteProspect(id) {
  return await apiCall(`/prospects/${id}`, 'DELETE');
}
```

#### Step 2: Update Popup UI

```html
<!-- popup.html -->
<button id="delete-btn">Delete Prospect</button>
```

#### Step 3: Update Popup Logic

```javascript
// popup.js
document.getElementById('delete-btn').addEventListener('click', async () => {
  const prospectId = 123; // Get from somewhere

  try {
    await deleteProspect(prospectId);
    showStatus('Prospect deleted successfully', 'success');
  } catch (error) {
    showStatus('Delete failed: ' + error.message, 'error');
  }
});
```

### Adding LinkedIn Selectors

When LinkedIn changes DOM or you want to extract new fields:

#### Step 1: Inspect LinkedIn Page

1. Go to LinkedIn search results
2. Right-click element → Inspect
3. Copy selector (right-click in DevTools → Copy → Copy selector)

#### Step 2: Update selectors.js

```javascript
// utils/selectors.js
const LINKEDIN_SELECTORS = {
  SEARCH: {
    // ... existing selectors
    MUTUAL_CONNECTIONS: '.entity-result__simple-insight-text', // NEW
  }
};
```

#### Step 3: Update Extractor

```javascript
// services/extractor.js
function extractProfileFromCard(card, selectors) {
  // ... existing extraction

  // NEW: Extract mutual connections
  const mutualEl = card.querySelector(selectors.MUTUAL_CONNECTIONS);
  prospect.mutual_connections = mutualEl ? mutualEl.textContent.trim() : null;

  return prospect;
}
```

#### Step 4: Update Backend

```php
// Laravel: database/migrations/..._prospects_table.php
$table->string('mutual_connections')->nullable();
```

```bash
php artisan migrate
```

### Adding New Storage Key

```javascript
// services/storage.js

// 1. Add key to STORAGE_KEYS
const STORAGE_KEYS = {
  // ... existing keys
  LAST_EXTRACTION_DATE: 'last_extraction_date'
};

// 2. Add getter
async function getLastExtractionDate() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_EXTRACTION_DATE);
  return result[STORAGE_KEYS.LAST_EXTRACTION_DATE] || null;
}

// 3. Add setter
async function setLastExtractionDate(date) {
  await chrome.storage.local.set({ [STORAGE_KEYS.LAST_EXTRACTION_DATE]: date });
}
```

---

## File Reference

### Core Files

| File | Lines | Purpose |
|------|-------|---------|
| `manifest.json` | 46 | Extension configuration |
| `background.js` | 93 | Background service worker |
| `popup.html` | ~80 | Popup UI structure |
| `popup.js` | 276 | Popup logic |
| `popup.css` | ~150 | Popup styles |
| `options.html` | ~90 | Settings UI structure |
| `options.js` | 256 | Settings logic |
| `options.css` | ~140 | Settings styles |
| `content-script.js` | 123 | Message handler |

### Services

| File | Lines | Purpose |
|------|-------|---------|
| `services/api.js` | 134 | Backend HTTP calls |
| `services/auth.js` | 100 | Authentication logic |
| `services/storage.js` | 112 | Chrome storage wrapper |
| `services/extractor.js` | 190 | LinkedIn DOM scraping |

### Utilities

| File | Lines | Purpose |
|------|-------|---------|
| `utils/selectors.js` | 86 | LinkedIn CSS selectors |

**Total**: ~1,680 lines of JavaScript (excluding styles)

---

## Troubleshooting Guide

### Content Script Not Loading

**Check**:
```javascript
// In LinkedIn page console
window.LINKEDIN_SELECTORS // Should be defined
typeof performExtraction   // Should be 'function'
```

**Fix**: Reload extension at `chrome://extensions/`

### Selectors Not Working

**Debug**:
```javascript
// In LinkedIn page console
const selector = '.reusable-search__result-container';
document.querySelectorAll(selector); // Should return NodeList
```

**Fix**: Update selectors in `utils/selectors.js`

### Auth Token Issues

**Check storage**:
```javascript
// In extension service worker console (chrome://extensions/ → service worker)
chrome.storage.local.get(null, data => console.log(data));
```

**Expected output**:
```javascript
{
  auth_token: "1|abcd1234...",
  user_email: "test@example.com",
  api_url: "http://localhost:8000/api",
  extraction_limit: 100
}
```

---

## Best Practices

### 1. Always Use Async/Await

```javascript
// Good
async function handleLogin(email, password) {
  const response = await login(email, password);
  await setAuthToken(response.token);
}

// Bad
function handleLogin(email, password) {
  login(email, password).then(response => {
    setAuthToken(response.token).then(() => {
      // Callback hell
    });
  });
}
```

### 2. Centralize API Calls

```javascript
// Good - all in api.js
async function bulkImportProspects(prospects) {
  return await apiCall('/prospects/bulk', 'POST', { prospects });
}

// Bad - direct fetch in popup.js
fetch('http://localhost:8000/api/prospects/bulk', {...})
```

### 3. Handle Errors Gracefully

```javascript
// Good
try {
  await performAction();
} catch (error) {
  showStatus('Action failed: ' + error.message, 'error');
  console.error('Detailed error:', error);
}

// Bad
await performAction(); // Unhandled promise rejection
```

### 4. Use Meaningful Console Logs

```javascript
// Good
console.log('[Extractor] Starting extraction with limit:', limit);
console.log('[Popup] Received response from content script:', response);

// Bad
console.log('starting'); // Which component? What's starting?
```

### 5. Validate User Input

```javascript
// Good
const limit = parseInt(limitInput.value);
if (isNaN(limit) || limit < 1 || limit > 100) {
  showStatus('Invalid limit', 'error');
  return;
}

// Bad
const limit = limitInput.value; // Could be "abc" or 9999
```

---

## Next Steps

1. **Read TESTING.md** - Learn how to test the extension
2. **Extract Test Data** - Try extracting 10-20 prospects
3. **Review Backend** - Verify prospects were saved to database
4. **Experiment** - Try different LinkedIn searches
5. **Extend** - Add new features using patterns from this guide

---

**Phase 3 Code Architecture Complete!**

You now understand how the Chrome extension works from top to bottom.

Proceed to **TESTING.md** for testing procedures and scenarios.

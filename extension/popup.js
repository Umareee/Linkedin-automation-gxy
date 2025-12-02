/**
 * Popup Script
 *
 * Handles popup UI logic including extraction button, progress updates, and user session.
 */

// DOM elements
let loginPrompt;
let loggedInState;
let userEmailEl;
let logoutBtn;
let extractBtn;
let stopBtn;
let limitInput;
let progressSection;
let currentCountEl;
let totalLimitEl;
let progressBar;
let statusMessage;
let statsSection;
let lastCountEl;
let loadingOverlay;

/**
 * Initialize popup when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Initializing...');

  // Get DOM elements
  loginPrompt = document.getElementById('login-prompt');
  loggedInState = document.getElementById('logged-in-state');
  userEmailEl = document.getElementById('user-email');
  logoutBtn = document.getElementById('logout-btn');
  extractBtn = document.getElementById('extract-btn');
  stopBtn = document.getElementById('stop-btn');
  limitInput = document.getElementById('limit-input');
  progressSection = document.getElementById('progress-section');
  currentCountEl = document.getElementById('current-count');
  totalLimitEl = document.getElementById('total-limit');
  progressBar = document.getElementById('progress-bar');
  statusMessage = document.getElementById('status-message');
  statsSection = document.getElementById('stats-section');
  lastCountEl = document.getElementById('last-count');
  loadingOverlay = document.getElementById('loading-overlay');

  // Set up event listeners
  document.getElementById('open-options').addEventListener('click', openOptions);
  logoutBtn.addEventListener('click', handleLogoutClick);
  extractBtn.addEventListener('click', handleExtractClick);
  stopBtn.addEventListener('click', handleStopClick);

  // Load saved extraction limit
  const savedLimit = await getExtractionLimit();
  limitInput.value = savedLimit;

  // Check authentication status
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    showLoginPrompt();
  } else {
    await showLoggedInState();
  }

  console.log('[Popup] Initialization complete');
});

/**
 * Listen for progress updates from content script
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'EXTRACTION_PROGRESS') {
    updateProgress(message.current, message.limit);
  }
});

/**
 * Show login prompt
 */
function showLoginPrompt() {
  loginPrompt.classList.remove('hidden');
  loggedInState.classList.add('hidden');
}

/**
 * Show logged in state
 */
async function showLoggedInState() {
  loginPrompt.classList.add('hidden');
  loggedInState.classList.remove('hidden');

  // Display user email
  const email = await getStoredUserEmail();
  if (email) {
    userEmailEl.textContent = email;
  }
}

/**
 * Open options page
 */
function openOptions() {
  chrome.runtime.openOptionsPage();
}

/**
 * Handle logout button click
 */
async function handleLogoutClick() {
  try {
    showLoading(true);
    await handleLogout();
    showLoginPrompt();
    showStatus('Logged out successfully', 'success');
  } catch (error) {
    showStatus('Logout failed: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
}

/**
 * Handle stop button click
 */
async function handleStopClick() {
  console.log('[Popup] Stop button clicked');

  try {
    // Disable stop button
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping...';

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab) {
      // Send stop message to content script
      chrome.tabs.sendMessage(tab.id, {
        type: 'STOP_EXTRACTION'
      }, (response) => {
        if (!chrome.runtime.lastError) {
          console.log('[Popup] Stop signal sent successfully');
          showStatus('Extraction stopped by user', 'info');
        }
      });
    }
  } catch (error) {
    console.error('[Popup] Error stopping extraction:', error);
  }
}

/**
 * Handle extract button click
 */
async function handleExtractClick() {
  console.log('[Popup] Extract button clicked');

  try {
    // Disable extract button, enable stop button
    extractBtn.disabled = true;
    extractBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    stopBtn.disabled = false;
    stopBtn.textContent = 'Stop Extraction';

    // Get limit
    const limit = parseInt(limitInput.value);

    if (limit < 1 || limit > 100) {
      showStatus('Please enter a limit between 1 and 100', 'error');
      resetButtons();
      return;
    }

    // Save limit for next time
    await setExtractionLimit(limit);

    // Show progress
    showProgress(true);
    updateProgress(0, limit);
    hideStatus();

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Check if tab is LinkedIn
    if (!tab.url.includes('linkedin.com')) {
      throw new Error('Please navigate to LinkedIn first');
    }

    // Send message to content script
    console.log('[Popup] Sending extraction request to content script');

    chrome.tabs.sendMessage(tab.id, {
      type: 'START_EXTRACTION',
      limit: limit
    }, async (response) => {
      // Check for errors
      if (chrome.runtime.lastError) {
        console.error('[Popup] Content script error:', chrome.runtime.lastError);
        showStatus('Error: Content script not loaded. Please refresh the LinkedIn page.', 'error');
        showProgress(false);
        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract Prospects';
        return;
      }

      console.log('[Popup] Received response from content script:', response);

      if (response.success) {
        // Send to backend
        try {
          showLoading(true);

          const result = await bulkImportProspects(response.prospects);

          console.log('[Popup] Backend import result:', result);

          // Show success message
          showStatus(
            `Success! Imported ${result.created} new prospects, skipped ${result.skipped} duplicates`,
            'success'
          );

          // Update stats
          lastCountEl.textContent = result.created;
          statsSection.classList.remove('hidden');

        } catch (error) {
          console.error('[Popup] Backend import error:', error);
          showStatus('Import failed: ' + error.message, 'error');
        } finally {
          showLoading(false);
        }
      } else {
        showStatus('Extraction failed: ' + response.error, 'error');
      }

      // Reset buttons
      showProgress(false);
      resetButtons();
    });

  } catch (error) {
    console.error('[Popup] Extraction error:', error);
    showStatus('Error: ' + error.message, 'error');
    showProgress(false);
    resetButtons();
  }
}

/**
 * Reset extract/stop buttons to initial state
 */
function resetButtons() {
  extractBtn.disabled = false;
  extractBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  stopBtn.disabled = false;
  stopBtn.textContent = 'Stop Extraction';
}

/**
 * Update progress bar
 * @param {number} current - Current count
 * @param {number} limit - Total limit
 */
function updateProgress(current, limit) {
  currentCountEl.textContent = current;
  totalLimitEl.textContent = limit;

  const percentage = (current / limit) * 100;
  progressBar.style.width = percentage + '%';
}

/**
 * Show/hide progress section
 * @param {boolean} show - Show or hide
 */
function showProgress(show) {
  if (show) {
    progressSection.classList.remove('hidden');
  } else {
    progressSection.classList.add('hidden');
  }
}

/**
 * Show status message
 * @param {string} message - Message text
 * @param {string} type - Message type (success, error, info)
 */
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = type;
  statusMessage.classList.remove('hidden');
}

/**
 * Hide status message
 */
function hideStatus() {
  statusMessage.classList.add('hidden');
}

/**
 * Show/hide loading overlay
 * @param {boolean} show - Show or hide
 */
function showLoading(show) {
  if (show) {
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

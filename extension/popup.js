/**
 * Popup Script
 *
 * Handles popup UI logic including extraction button, progress updates,
 * campaign management, and user session.
 */

// DOM elements - Common
let loginPrompt;
let loggedInState;
let userEmailEl;
let logoutBtn;
let loadingOverlay;
let statusMessage;

// DOM elements - Tabs
let tabExtract;
let tabCampaigns;
let extractionSection;
let campaignsSection;

// DOM elements - Extraction
let extractBtn;
let stopBtn;
let limitInput;
let progressSection;
let currentCountEl;
let totalLimitEl;
let progressBar;
let statsSection;
let lastCountEl;

// DOM elements - Campaigns
let queueStatusIcon;
let queueStatusText;
let queueMessage;
let campaignList;
let queueStats;
let statsCompleted;
let statsFailed;
let statsLimit;
let startQueueBtn;
let stopQueueBtn;
let refreshCampaignsBtn;

/**
 * Initialize popup when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Initializing...');

  // Get DOM elements - Common
  loginPrompt = document.getElementById('login-prompt');
  loggedInState = document.getElementById('logged-in-state');
  userEmailEl = document.getElementById('user-email');
  logoutBtn = document.getElementById('logout-btn');
  loadingOverlay = document.getElementById('loading-overlay');
  statusMessage = document.getElementById('status-message');

  // Get DOM elements - Tabs
  tabExtract = document.getElementById('tab-extract');
  tabCampaigns = document.getElementById('tab-campaigns');
  extractionSection = document.getElementById('extraction-section');
  campaignsSection = document.getElementById('campaigns-section');

  // Get DOM elements - Extraction
  extractBtn = document.getElementById('extract-btn');
  stopBtn = document.getElementById('stop-btn');
  limitInput = document.getElementById('limit-input');
  progressSection = document.getElementById('progress-section');
  currentCountEl = document.getElementById('current-count');
  totalLimitEl = document.getElementById('total-limit');
  progressBar = document.getElementById('progress-bar');
  statsSection = document.getElementById('stats-section');
  lastCountEl = document.getElementById('last-count');

  // Get DOM elements - Campaigns
  queueStatusIcon = document.getElementById('queue-status-icon');
  queueStatusText = document.getElementById('queue-status-text');
  queueMessage = document.getElementById('queue-message');
  campaignList = document.getElementById('campaign-list');
  queueStats = document.getElementById('queue-stats');
  statsCompleted = document.getElementById('stats-completed');
  statsFailed = document.getElementById('stats-failed');
  statsLimit = document.getElementById('stats-limit');
  startQueueBtn = document.getElementById('start-queue-btn');
  stopQueueBtn = document.getElementById('stop-queue-btn');
  refreshCampaignsBtn = document.getElementById('refresh-campaigns-btn');

  // Set up event listeners - Common
  document.getElementById('open-options').addEventListener('click', openOptions);
  logoutBtn.addEventListener('click', handleLogoutClick);

  // Set up event listeners - Tabs
  tabExtract.addEventListener('click', () => switchTab('extract'));
  tabCampaigns.addEventListener('click', () => switchTab('campaigns'));

  // Set up event listeners - Extraction
  extractBtn.addEventListener('click', handleExtractClick);
  stopBtn.addEventListener('click', handleStopClick);

  // Set up event listeners - Campaigns
  startQueueBtn.addEventListener('click', handleStartQueue);
  stopQueueBtn.addEventListener('click', handleStopQueue);
  refreshCampaignsBtn.addEventListener('click', loadCampaignData);

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
 * Switch between tabs
 * @param {string} tab - 'extract' or 'campaigns'
 */
function switchTab(tab) {
  if (tab === 'extract') {
    tabExtract.classList.add('active');
    tabCampaigns.classList.remove('active');
    extractionSection.classList.remove('hidden');
    campaignsSection.classList.add('hidden');
  } else {
    tabExtract.classList.remove('active');
    tabCampaigns.classList.add('active');
    extractionSection.classList.add('hidden');
    campaignsSection.classList.remove('hidden');

    // Load campaign data when switching to campaigns tab
    loadCampaignData();
  }
}

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

// ==================== CAMPAIGN FUNCTIONS ====================

/**
 * Load campaign data from API and storage
 */
async function loadCampaignData() {
  console.log('[Popup] Loading campaign data...');

  try {
    // Get queue status from storage
    const stored = await chrome.storage.local.get(['queue_status', 'active_campaigns']);

    // Update queue status UI
    if (stored.queue_status) {
      updateQueueStatusUI(stored.queue_status);
    }

    // Fetch fresh campaign data from API
    const response = await getActiveCampaigns();

    if (response.success) {
      renderCampaignList(response.campaigns);

      // Store for later
      await chrome.storage.local.set({ active_campaigns: response.campaigns });
    }

    // Fetch action stats
    const statsResponse = await getActionStats();
    if (statsResponse.success) {
      updateQueueStats(statsResponse.stats, statsResponse.daily_limit);
    }

  } catch (error) {
    console.error('[Popup] Error loading campaign data:', error);
    showStatus('Failed to load campaigns: ' + error.message, 'error');
  }
}

/**
 * Update queue status UI
 * @param {object} status - Queue status object
 */
function updateQueueStatusUI(status) {
  const statusColors = {
    'running': '#22c55e',      // green
    'executing': '#22c55e',    // green
    'waiting': '#eab308',      // yellow
    'verifying': '#3b82f6',    // blue
    'paused': '#f97316',       // orange
    'stopped': '#6b7280',      // gray
    'limit_reached': '#ef4444' // red
  };

  const color = statusColors[status.status] || '#6b7280';
  queueStatusIcon.style.color = color;
  queueStatusText.textContent = status.status || 'Not running';
  queueMessage.textContent = status.message || '';

  // Update button visibility
  if (status.isRunning) {
    startQueueBtn.classList.add('hidden');
    stopQueueBtn.classList.remove('hidden');
  } else {
    startQueueBtn.classList.remove('hidden');
    stopQueueBtn.classList.add('hidden');
  }
}

/**
 * Update queue statistics display
 * @param {object} stats - Stats object
 * @param {number} dailyLimit - Daily limit
 */
function updateQueueStats(stats, dailyLimit) {
  queueStats.classList.remove('hidden');
  statsCompleted.textContent = stats.today_completed || 0;
  statsFailed.textContent = stats.today_failed || 0;
  statsLimit.textContent = dailyLimit || 50;
}

/**
 * Render campaign list
 * @param {Array} campaigns - Array of campaign objects
 */
function renderCampaignList(campaigns) {
  if (!campaigns || campaigns.length === 0) {
    campaignList.innerHTML = '<p class="no-campaigns">No active campaigns</p>';
    return;
  }

  let html = '';

  for (const campaign of campaigns) {
    const progress = campaign.progress_percentage || 0;

    html += `
      <div class="campaign-item">
        <div class="campaign-header">
          <span class="campaign-name">${escapeHtml(campaign.name)}</span>
          <span class="campaign-status ${campaign.status}">${campaign.status}</span>
        </div>
        <div class="campaign-progress">
          <div class="progress-bar-mini" style="width: ${progress}%"></div>
        </div>
        <div class="campaign-stats">
          <span>${campaign.processed_prospects}/${campaign.total_prospects} prospects</span>
          <span>${campaign.pending_actions} pending</span>
        </div>
      </div>
    `;
  }

  campaignList.innerHTML = html;
}

/**
 * Handle start queue button click
 */
async function handleStartQueue() {
  console.log('[Popup] Starting queue...');

  try {
    startQueueBtn.disabled = true;
    startQueueBtn.textContent = 'Starting...';

    // Send message to background to start queue
    const response = await chrome.runtime.sendMessage({ type: 'START_CAMPAIGN_QUEUE' });

    if (response.success) {
      updateQueueStatusUI({ isRunning: true, status: 'running', message: 'Queue started' });
      showStatus('Queue started successfully', 'success');
    } else {
      showStatus('Failed to start queue: ' + (response.error || 'Unknown error'), 'error');
    }

  } catch (error) {
    console.error('[Popup] Error starting queue:', error);
    showStatus('Error starting queue: ' + error.message, 'error');
  } finally {
    startQueueBtn.disabled = false;
    startQueueBtn.textContent = 'Start Queue';
  }
}

/**
 * Handle stop queue button click
 */
async function handleStopQueue() {
  console.log('[Popup] Stopping queue...');

  try {
    stopQueueBtn.disabled = true;
    stopQueueBtn.textContent = 'Stopping...';

    // Send message to background to stop queue
    const response = await chrome.runtime.sendMessage({
      type: 'STOP_CAMPAIGN_QUEUE',
      reason: 'User stopped from popup'
    });

    if (response.success) {
      updateQueueStatusUI({ isRunning: false, status: 'stopped', message: 'Queue stopped by user' });
      showStatus('Queue stopped', 'info');
    } else {
      showStatus('Failed to stop queue: ' + (response.error || 'Unknown error'), 'error');
    }

  } catch (error) {
    console.error('[Popup] Error stopping queue:', error);
    showStatus('Error stopping queue: ' + error.message, 'error');
  } finally {
    stopQueueBtn.disabled = false;
    stopQueueBtn.textContent = 'Stop Queue';
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Listen for queue status updates from background
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'QUEUE_STATUS') {
    updateQueueStatusUI({
      isRunning: message.status === 'running' || message.status === 'executing',
      status: message.status,
      message: message.message
    });
  }

  if (message.type === 'QUEUE_ERROR') {
    showStatus('Queue error: ' + message.message, 'error');
  }
});

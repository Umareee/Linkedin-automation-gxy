/**
 * Options Page Script (OAuth Version)
 *
 * Handles LinkedIn OAuth login, logout, and settings management.
 */

// DOM elements
let authSection;
let settingsSection;
let linkedInLoginBtn;
let authMessage;
let logoutBtn;
let userNameEl;
let userEmailEl;
let userAvatarEl;
let userAvatarPlaceholder;
let apiUrlInput;
let saveApiUrlBtn;
let apiUrlMessage;
let defaultLimitInput;
let saveLimitBtn;
let limitMessage;
let loadingOverlay;

/**
 * Initialize options page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Options] Initializing...');

  // Get DOM elements
  authSection = document.getElementById('auth-section');
  settingsSection = document.getElementById('settings-section');
  linkedInLoginBtn = document.getElementById('linkedin-login-btn');
  authMessage = document.getElementById('auth-message');
  logoutBtn = document.getElementById('logout-btn');
  userNameEl = document.getElementById('user-name');
  userEmailEl = document.getElementById('user-email');
  userAvatarEl = document.getElementById('user-avatar');
  userAvatarPlaceholder = document.getElementById('user-avatar-placeholder');
  apiUrlInput = document.getElementById('api-url');
  saveApiUrlBtn = document.getElementById('save-api-url');
  apiUrlMessage = document.getElementById('api-url-message');
  defaultLimitInput = document.getElementById('default-limit');
  saveLimitBtn = document.getElementById('save-limit');
  limitMessage = document.getElementById('limit-message');
  loadingOverlay = document.getElementById('loading-overlay');

  // Set up event listeners
  linkedInLoginBtn.addEventListener('click', handleLinkedInLogin);
  logoutBtn.addEventListener('click', handleLogoutClick);
  saveApiUrlBtn.addEventListener('click', handleSaveApiUrl);
  saveLimitBtn.addEventListener('click', handleSaveLimit);

  // Listen for auth state changes from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AUTH_STATE_CHANGED') {
      console.log('[Options] Auth state changed, reloading...');
      // Reload the page to update UI
      window.location.reload();
    }
  });

  // Load saved values
  await loadSavedSettings();

  // Check authentication status
  const authenticated = await isAuthenticated();

  if (authenticated) {
    await showSettingsSection();
  } else {
    showAuthSection();
  }

  console.log('[Options] Initialization complete');
});

/**
 * Load saved settings from storage
 */
async function loadSavedSettings() {
  const apiUrl = await getApiUrl();
  const limit = await getExtractionLimit();

  apiUrlInput.value = apiUrl;
  defaultLimitInput.value = limit;
}

/**
 * Handle LinkedIn OAuth login button click
 * Opens the webapp in a new tab for OAuth authentication
 */
function handleLinkedInLogin() {
  console.log('[Options] Opening webapp for LinkedIn OAuth...');

  // Open webapp login page in new tab
  chrome.tabs.create({
    url: 'http://localhost:3000/login',
    active: true
  });

  // Show info message
  showMessage(authMessage, 'Opening login page... Complete the sign-in and this page will update automatically.', 'info');
}

/**
 * Show auth section (OAuth login)
 */
function showAuthSection() {
  authSection.classList.remove('hidden');
  settingsSection.classList.add('hidden');
}

/**
 * Show settings section
 * Displays user profile information
 */
async function showSettingsSection() {
  authSection.classList.add('hidden');
  settingsSection.classList.remove('hidden');

  // Get user data from storage
  const user = await getCurrentUser();

  if (user) {
    // Display user name
    if (user.name) {
      userNameEl.textContent = user.name;
    }

    // Display user email
    if (user.email) {
      userEmailEl.textContent = user.email;
    }

    // Display user avatar
    if (user.profile_image_url) {
      userAvatarEl.src = user.profile_image_url;
      userAvatarEl.classList.remove('hidden');
      userAvatarPlaceholder.classList.add('hidden');
    } else {
      userAvatarEl.classList.add('hidden');
      userAvatarPlaceholder.classList.remove('hidden');
    }
  }
}

/**
 * Handle logout button click
 */
async function handleLogoutClick() {
  try {
    showLoading(true);

    await handleLogout();

    console.log('[Options] Logout successful');

    // Show auth section
    showAuthSection();

    showMessage(authMessage, 'Logged out successfully', 'success');

  } catch (error) {
    console.error('[Options] Logout error:', error);
  } finally {
    showLoading(false);
  }
}

/**
 * Handle save API URL button click
 */
async function handleSaveApiUrl() {
  const apiUrl = apiUrlInput.value.trim();

  if (!apiUrl) {
    showMessage(apiUrlMessage, 'Please enter a valid URL', 'error');
    return;
  }

  try {
    await setApiUrl(apiUrl);
    showMessage(apiUrlMessage, 'API URL saved successfully', 'success');

    // Hide message after 2 seconds
    setTimeout(() => {
      hideMessage(apiUrlMessage);
    }, 2000);

  } catch (error) {
    showMessage(apiUrlMessage, 'Failed to save API URL', 'error');
  }
}

/**
 * Handle save limit button click
 */
async function handleSaveLimit() {
  const limit = parseInt(defaultLimitInput.value);

  if (isNaN(limit) || limit < 1 || limit > 100) {
    showMessage(limitMessage, 'Please enter a number between 1 and 100', 'error');
    return;
  }

  try {
    await setExtractionLimit(limit);
    showMessage(limitMessage, 'Extraction limit saved successfully', 'success');

    // Hide message after 2 seconds
    setTimeout(() => {
      hideMessage(limitMessage);
    }, 2000);

  } catch (error) {
    showMessage(limitMessage, 'Failed to save extraction limit', 'error');
  }
}

/**
 * Show message
 * @param {HTMLElement} element - Message element
 * @param {string} text - Message text
 * @param {string} type - Message type (success, error, info)
 */
function showMessage(element, text, type) {
  element.textContent = text;
  element.className = 'message ' + type;
  element.classList.remove('hidden');
}

/**
 * Hide message
 * @param {HTMLElement} element - Message element
 */
function hideMessage(element) {
  element.classList.add('hidden');
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

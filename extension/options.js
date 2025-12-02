/**
 * Options Page Script
 *
 * Handles login, logout, and settings management.
 */

// DOM elements
let authSection;
let settingsSection;

// Tab elements
let loginTabBtn;
let signupTabBtn;
let loginTab;
let signupTab;

// Login form elements
let loginForm;
let loginEmailInput;
let loginPasswordInput;
let loginBtn;
let loginMessage;

// Signup form elements
let signupForm;
let signupNameInput;
let signupEmailInput;
let signupPasswordInput;
let signupPasswordConfirmInput;
let signupBtn;
let signupMessage;

// Settings elements
let currentUserEl;
let logoutBtn;
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

  // Tab elements
  loginTabBtn = document.getElementById('login-tab-btn');
  signupTabBtn = document.getElementById('signup-tab-btn');
  loginTab = document.getElementById('login-tab');
  signupTab = document.getElementById('signup-tab');

  // Login form elements
  loginForm = document.getElementById('login-form');
  loginEmailInput = document.getElementById('login-email');
  loginPasswordInput = document.getElementById('login-password');
  loginBtn = document.getElementById('login-btn');
  loginMessage = document.getElementById('login-message');

  // Signup form elements
  signupForm = document.getElementById('signup-form');
  signupNameInput = document.getElementById('signup-name');
  signupEmailInput = document.getElementById('signup-email');
  signupPasswordInput = document.getElementById('signup-password');
  signupPasswordConfirmInput = document.getElementById('signup-password-confirm');
  signupBtn = document.getElementById('signup-btn');
  signupMessage = document.getElementById('signup-message');

  // Settings elements
  currentUserEl = document.getElementById('current-user');
  logoutBtn = document.getElementById('logout-btn');
  apiUrlInput = document.getElementById('api-url');
  saveApiUrlBtn = document.getElementById('save-api-url');
  apiUrlMessage = document.getElementById('api-url-message');
  defaultLimitInput = document.getElementById('default-limit');
  saveLimitBtn = document.getElementById('save-limit');
  limitMessage = document.getElementById('limit-message');
  loadingOverlay = document.getElementById('loading-overlay');

  // Set up event listeners
  loginTabBtn.addEventListener('click', () => switchTab('login'));
  signupTabBtn.addEventListener('click', () => switchTab('signup'));
  loginForm.addEventListener('submit', handleLoginSubmit);
  signupForm.addEventListener('submit', handleSignupSubmit);
  logoutBtn.addEventListener('click', handleLogoutClick);
  saveApiUrlBtn.addEventListener('click', handleSaveApiUrl);
  saveLimitBtn.addEventListener('click', handleSaveLimit);

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
 * Switch between login and signup tabs
 * @param {string} tab - 'login' or 'signup'
 */
function switchTab(tab) {
  if (tab === 'login') {
    // Activate login tab
    loginTabBtn.classList.add('active');
    signupTabBtn.classList.remove('active');
    loginTab.classList.add('active');
    signupTab.classList.remove('active');

    // Clear signup form
    signupForm.reset();
    hideMessage(signupMessage);
  } else if (tab === 'signup') {
    // Activate signup tab
    loginTabBtn.classList.remove('active');
    signupTabBtn.classList.add('active');
    loginTab.classList.remove('active');
    signupTab.classList.add('active');

    // Clear login form
    loginForm.reset();
    hideMessage(loginMessage);
  }
}

/**
 * Show auth section (login/signup)
 */
function showAuthSection() {
  authSection.classList.remove('hidden');
  settingsSection.classList.add('hidden');
}

/**
 * Show settings section
 */
async function showSettingsSection() {
  authSection.classList.add('hidden');
  settingsSection.classList.remove('hidden');

  // Display user email
  const email = await getStoredUserEmail();
  if (email) {
    currentUserEl.textContent = email;
  }
}

/**
 * Handle login form submit
 */
async function handleLoginSubmit(event) {
  event.preventDefault();

  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    showMessage(loginMessage, 'Please enter email and password', 'error');
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    showLoading(true);

    // Attempt login
    const user = await handleLogin(email, password);

    console.log('[Options] Login successful:', user);

    // Show success message
    showMessage(loginMessage, 'Login successful!', 'success');

    // Clear form
    loginPasswordInput.value = '';

    // Switch to settings view after short delay
    setTimeout(() => {
      showSettingsSection();
    }, 1000);

  } catch (error) {
    console.error('[Options] Login error:', error);
    showMessage(loginMessage, 'Login failed: ' + error.message, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
    showLoading(false);
  }
}

/**
 * Handle signup form submit
 */
async function handleSignupSubmit(event) {
  event.preventDefault();

  const name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;
  const passwordConfirm = signupPasswordConfirmInput.value;

  // Validation
  if (!name || !email || !password || !passwordConfirm) {
    showMessage(signupMessage, 'Please fill in all fields', 'error');
    return;
  }

  if (password !== passwordConfirm) {
    showMessage(signupMessage, 'Passwords do not match', 'error');
    return;
  }

  if (password.length < 8) {
    showMessage(signupMessage, 'Password must be at least 8 characters', 'error');
    return;
  }

  try {
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
    showLoading(true);

    // Call register endpoint
    const response = await register(name, email, password, passwordConfirm);

    console.log('[Options] Signup successful:', response);

    // Store token and email
    await setAuthToken(response.token);
    await setUserEmail(email);

    // Show success message
    showMessage(signupMessage, 'Account created successfully!', 'success');

    // Clear form
    signupForm.reset();

    // Switch to settings view after short delay
    setTimeout(() => {
      showSettingsSection();
    }, 1500);

  } catch (error) {
    console.error('[Options] Signup error:', error);

    // Handle validation errors
    let errorMessage = 'Signup failed: ' + error.message;

    if (error.errors) {
      // Laravel validation errors
      const errorMessages = Object.values(error.errors).flat();
      if (errorMessages.length > 0) {
        errorMessage = errorMessages.join(', ');
      }
    }

    showMessage(signupMessage, errorMessage, 'error');
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign Up';
    showLoading(false);
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

    // Clear login form
    loginEmailInput.value = '';
    loginPasswordInput.value = '';

    showMessage(loginMessage, 'Logged out successfully', 'success');

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

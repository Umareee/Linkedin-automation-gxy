/**
 * Authentication Service (OAuth Version)
 *
 * Manages authentication state and user session.
 * Authentication is handled via LinkedIn OAuth (background.js receives token from webapp).
 * This service handles logout and token validation only.
 */

/**
 * Check if user is authenticated
 * Verifies token exists and is still valid by calling /user endpoint
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
async function isAuthenticated() {
  const token = await getAuthToken();

  // No token means not authenticated
  if (!token) {
    return false;
  }

  // Verify token is still valid with backend
  try {
    await getUser();
    return true;
  } catch (error) {
    // Token is invalid or expired
    await clearAuth();
    return false;
  }
}

/**
 * Handle user logout
 * Revokes token on backend and clears local storage
 * @returns {Promise<void>}
 */
async function handleLogout() {
  try {
    // Try to revoke token on backend
    await logout();
  } catch (error) {
    // Even if API call fails, clear local data
    console.error('Logout API call failed:', error);
  } finally {
    // Always clear local auth data
    await clearAuth();
  }
}

/**
 * Get current authenticated user
 * @returns {Promise<object|null>} User object or null if not authenticated
 */
async function getCurrentUser() {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    return null;
  }

  try {
    const response = await getUser();
    return response.data || response; // Handle both {data: user} and direct user response
  } catch (error) {
    return null;
  }
}

/**
 * Get stored user email
 * @returns {Promise<string|null>} User email or null
 */
async function getStoredUserEmail() {
  return await getUserEmail();
}

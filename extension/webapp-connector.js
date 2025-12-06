/**
 * Webapp Connector Content Script
 *
 * This script runs on the webapp (localhost:3000) and:
 * 1. Injects the extension ID into the page for easy communication
 * 2. Stores the extension ID in localStorage for the webapp to use
 *
 * This allows the webapp to communicate with the extension without
 * requiring manual configuration of the extension ID.
 */

(function() {
  console.log('[WebappConnector] Initializing...');

  // Get the extension ID
  const extensionId = chrome.runtime.id;
  console.log('[WebappConnector] Extension ID:', extensionId);

  // Store in localStorage for the webapp to use
  try {
    localStorage.setItem('linkedin_automation_extension_id', extensionId);
    console.log('[WebappConnector] Extension ID saved to localStorage');
  } catch (e) {
    console.error('[WebappConnector] Failed to save extension ID:', e);
  }

  // Also expose it on window for immediate access
  window.__LINKEDIN_AUTOMATION_EXTENSION_ID__ = extensionId;

  // Dispatch a custom event to notify the webapp
  window.dispatchEvent(new CustomEvent('linkedin-automation-extension-ready', {
    detail: { extensionId }
  }));

  console.log('[WebappConnector] Extension connected to webapp');
})();

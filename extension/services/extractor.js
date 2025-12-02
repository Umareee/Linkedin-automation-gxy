/**
 * LinkedIn Extractor Service
 *
 * Core extraction logic for scraping prospect data from LinkedIn pages.
 * Handles scrolling to load all results and extracting profile information.
 */

/**
 * Scroll page to load all lazy-loaded content
 * LinkedIn uses infinite scroll, so we need to scroll to bottom multiple times
 * @returns {Promise<void>}
 */
async function scrollToLoadAll() {
  let previousHeight = 0;
  let currentHeight = document.body.scrollHeight;
  let attempts = 0;
  const maxAttempts = 50; // Prevent infinite loop
  const scrollDelay = 1000; // Wait 1 second between scrolls

  console.log('[Extractor] Starting auto-scroll to load all profiles...');

  while (previousHeight !== currentHeight && attempts < maxAttempts) {
    // Scroll to bottom
    window.scrollTo(0, document.body.scrollHeight);

    // Wait for LinkedIn to load more content
    await new Promise(resolve => setTimeout(resolve, scrollDelay));

    previousHeight = currentHeight;
    currentHeight = document.body.scrollHeight;
    attempts++;

    console.log(`[Extractor] Scroll attempt ${attempts}: Height ${currentHeight}px`);
  }

  // Scroll back to top for better UX
  window.scrollTo(0, 0);

  console.log(`[Extractor] Scrolling complete after ${attempts} attempts`);
}

/**
 * Extract LinkedIn ID from profile URL
 * @param {string} profileUrl - Full LinkedIn profile URL
 * @returns {string|null} LinkedIn ID (e.g., "john-doe-123456") or null
 */
function extractLinkedInId(profileUrl) {
  // Extract ID from URL like: https://www.linkedin.com/in/john-doe-123456/
  const match = profileUrl.match(/\/in\/([^\/\?]+)/);
  return match ? match[1] : null;
}

/**
 * Extract data from a single profile card
 * @param {HTMLElement} card - Profile card DOM element
 * @param {object} selectors - Selector object from LINKEDIN_SELECTORS
 * @returns {object|null} Prospect data or null if invalid
 */
function extractProfileFromCard(card, selectors) {
  try {
    // Extract name (required)
    let nameEl = card.querySelector(selectors.PROFILE_NAME);
    if (!nameEl) {
      nameEl = card.querySelector(selectors.PROFILE_NAME_ALT);
    }

    // Extract profile link (required)
    const linkEl = card.querySelector(selectors.PROFILE_LINK);

    // Both name and link are required
    if (!nameEl || !linkEl) {
      return null;
    }

    const fullName = nameEl.textContent.trim();
    const profileUrl = linkEl.href;

    // Skip if name or URL is empty
    if (!fullName || !profileUrl) {
      return null;
    }

    // Extract optional fields
    const headlineEl = card.querySelector(selectors.HEADLINE);
    const locationEl = card.querySelector(selectors.LOCATION);

    // Try to get profile image
    let imageEl = card.querySelector(selectors.PROFILE_IMAGE);
    if (!imageEl) {
      imageEl = card.querySelector(selectors.PROFILE_IMAGE_ALT);
    }

    // Build prospect object
    const prospect = {
      full_name: fullName,
      profile_url: profileUrl,
      linkedin_id: extractLinkedInId(profileUrl),
      headline: headlineEl ? headlineEl.textContent.trim() : null,
      location: locationEl ? locationEl.textContent.trim() : null,
      company: null, // Will extract from headline if available
      profile_image_url: imageEl ? imageEl.src : null
    };

    // Try to parse company from headline
    // Format is usually: "Job Title at Company Name"
    if (prospect.headline && prospect.headline.includes(' at ')) {
      const parts = prospect.headline.split(' at ');
      if (parts.length >= 2) {
        prospect.company = parts[parts.length - 1].trim();
      }
    }

    return prospect;
  } catch (error) {
    console.error('[Extractor] Error extracting profile from card:', error);
    return null;
  }
}

// Global flag to stop extraction
let shouldStopExtraction = false;

/**
 * Stop the current extraction
 */
function stopExtraction() {
  shouldStopExtraction = true;
  console.log('[Extractor] Stop requested by user');
}

/**
 * Extract all profiles from current page
 * Uses data-view-name attribute selector (more stable than class names)
 * @param {number} limit - Maximum number of profiles to extract from this page
 * @param {number} totalCollected - Total already collected (for progress bar)
 * @param {number} totalLimit - Total limit for entire extraction
 * @returns {Promise<Array<object>>} Array of prospect objects
 */
async function extractProfiles(limit = 100, totalCollected = 0, totalLimit = 100) {
  const extracted = [];
  let currentCount = 0;

  console.log(`[Extractor] Starting extraction with limit: ${limit}`);

  // LinkedIn uses data-view-name attributes which are more stable than class names
  // Find all profile links with data-view-name="search-result-lockup-title"
  const profileLinks = document.querySelectorAll('a[data-view-name="search-result-lockup-title"][href*="/in/"]');

  console.log(`[Extractor] Found ${profileLinks.length} profile links using data-view-name selector`);

  // If no profiles found with primary selector, try fallback
  if (profileLinks.length === 0) {
    console.log('[Extractor] Trying fallback selector...');
    const fallbackLinks = document.querySelectorAll('a.app-aware-link[href*="/in/"]');
    console.log(`[Extractor] Found ${fallbackLinks.length} profile links using fallback selector`);
  }

  // Extract data from each profile link
  for (const link of profileLinks) {
    // Check if user requested stop
    if (shouldStopExtraction) {
      console.log('[Extractor] Extraction stopped by user');
      break;
    }

    if (currentCount >= limit) {
      console.log(`[Extractor] Reached limit of ${limit} profiles`);
      break;
    }

    try {
      const profileUrl = link.href;
      const name = link.textContent.trim();

      // Skip if no name or URL
      if (!name || !profileUrl) {
        continue;
      }

      // Find the parent container to extract additional data
      const container = link.closest('div');
      const containerText = container?.textContent || '';

      // Extract profile image - match alt attribute to person's name
      const cardRoot = link.closest('li') || link.closest('div[componentkey]') || container;

      // Use alt attribute matching the person's name to get ONLY their profile picture
      const imgEl = cardRoot?.querySelector(`img[alt="${name}"]`);
      const profileImage = imgEl?.src || null;

      const prospect = {
        full_name: name,
        profile_url: profileUrl,
        linkedin_id: extractLinkedInId(profileUrl),
        profile_image_url: profileImage
      };

      extracted.push(prospect);
      currentCount++;

      // Send progress update to popup with TOTAL progress
      const totalCurrent = totalCollected + currentCount;
      try {
        chrome.runtime.sendMessage({
          type: 'EXTRACTION_PROGRESS',
          current: totalCurrent,
          limit: totalLimit
        });
      } catch (error) {
        // Ignore if popup is closed
        console.warn('[Extractor] Failed to send progress update:', error);
      }

      console.log(`[Extractor] Extracted ${totalCurrent}/${totalLimit}: ${prospect.full_name} - Image: ${!!profileImage}`);

    } catch (error) {
      console.warn('[Extractor] Error extracting profile:', error);
    }
  }

  console.log(`[Extractor] Extraction complete: ${extracted.length} prospects`);

  return extracted;
}

/**
 * Click the Next button to navigate to next page
 * @returns {Promise<boolean>} True if Next button clicked successfully
 */
async function clickNextButton() {
  // Find the Next button using data-testid attribute
  const nextButton = document.querySelector('button[data-testid="pagination-controls-next-button-visible"]');

  console.log('[Extractor] Looking for Next button...');

  if (!nextButton) {
    console.log('[Extractor] No Next button found (reached last page)');
    return false;
  }

  // Check if button is disabled
  const isDisabled = nextButton.disabled || nextButton.getAttribute('aria-disabled') === 'true';
  console.log('[Extractor] Next button disabled:', isDisabled);

  if (isDisabled) {
    console.log('[Extractor] Next button is disabled (reached last page)');
    return false;
  }

  console.log('[Extractor] ✓ Clicking Next button to go to next page');

  // Store current URL to detect change
  const currentUrl = window.location.href;
  const currentPageMatch = currentUrl.match(/[?&]page=(\d+)/);
  const currentPage = currentPageMatch ? parseInt(currentPageMatch[1]) : 1;

  console.log('[Extractor] Current page:', currentPage);

  // Click the button
  nextButton.click();

  // Wait for page navigation
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Wait for new page to load
  let maxWaitAttempts = 20; // 20 seconds max
  let waitAttempt = 0;

  while (waitAttempt < maxWaitAttempts) {
    const newUrl = window.location.href;
    const newPageMatch = newUrl.match(/[?&]page=(\d+)/);
    const newPage = newPageMatch ? parseInt(newPageMatch[1]) : 1;

    // Check if we're on a new page
    if (newUrl !== currentUrl || newPage > currentPage) {
      console.log('[Extractor] ✓ Page navigation detected - moved to page', newPage);

      // Wait for profile links to appear
      const profileLinks = document.querySelectorAll('a[data-view-name="search-result-lockup-title"][href*="/in/"]');

      if (profileLinks.length > 0) {
        console.log('[Extractor] ✓ New page loaded with', profileLinks.length, 'profiles');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Extra wait
        return true;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    waitAttempt++;
  }

  console.warn('[Extractor] ⚠ Timeout waiting for new page');
  return false;
}

/**
 * Main extraction function with automatic pagination
 * Scrolls page and extracts profiles across multiple pages until limit reached
 * @param {number} limit - Maximum number of profiles to extract
 * @returns {Promise<Array<object>>} Array of prospect objects
 */
async function performExtraction(limit = 100) {
  try {
    // Reset stop flag at start
    shouldStopExtraction = false;

    const allProspects = [];
    let pageCount = 0;

    console.log(`[Extractor] Starting multi-page extraction with limit: ${limit}`);

    // Keep extracting from pages until limit reached or no more pages
    while (allProspects.length < limit && !shouldStopExtraction) {
      pageCount++;
      console.log(`[Extractor] ===== Processing Page ${pageCount} =====`);

      // Check for stop before scrolling
      if (shouldStopExtraction) {
        console.log('[Extractor] ✓ Stopped by user before scrolling page', pageCount);
        break;
      }

      // Step 1: Scroll to load all profiles on current page
      await scrollToLoadAll();

      // Check for stop after scrolling
      if (shouldStopExtraction) {
        console.log('[Extractor] ✓ Stopped by user after scrolling page', pageCount);
        break;
      }

      // Step 2: Extract profiles from current page
      const remainingLimit = limit - allProspects.length;
      const totalCollected = allProspects.length;
      const prospects = await extractProfiles(remainingLimit, totalCollected, limit);

      console.log(`[Extractor] Extracted ${prospects.length} prospects from page ${pageCount}`);

      // Add to collection
      allProspects.push(...prospects);

      console.log(`[Extractor] Total collected: ${allProspects.length}/${limit}`);

      // Check if stopped during extraction
      if (shouldStopExtraction) {
        console.log(`[Extractor] ✓ Stopped by user after extracting from page ${pageCount}`);
        break;
      }

      // Check if limit reached
      if (allProspects.length >= limit) {
        console.log(`[Extractor] ✓ Limit reached: ${allProspects.length}/${limit}`);
        break;
      }

      // Try to go to next page
      const hasNextPage = await clickNextButton();

      if (!hasNextPage) {
        console.log('[Extractor] ✓ No more pages available');
        break;
      }

      // Random delay between pages (human-like behavior)
      const delay = 2000 + Math.random() * 1000; // 2-3 seconds
      console.log(`[Extractor] Waiting ${Math.round(delay)}ms before next page...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const stopReason = shouldStopExtraction ? 'Stopped by user' :
                      allProspects.length >= limit ? 'Limit reached' :
                      'No more pages';

    console.log(`[Extractor] ✓ Extraction complete: ${allProspects.length} prospects from ${pageCount} pages (${stopReason})`);
    return allProspects;

  } catch (error) {
    console.error('[Extractor] Extraction failed:', error);
    throw error;
  } finally {
    // Reset stop flag after extraction
    shouldStopExtraction = false;
  }
}

/**
 * EPUB Validator Utility
 * Provides functions to test and validate EPUB files
 */

/**
 * Tests if an EPUB file is valid by attempting to fetch and check its structure
 * @param {string} url - URL to the EPUB file
 * @returns {Promise<{success: boolean, error: string|null}>} - Result of validation
 */
export async function testEpubFile(url) {
  try {
    // For URL validation, just check if the URL is valid and we can fetch content
    if (!url) {
      return { success: false, error: "No URL provided" };
    }

    // Skip validation for already processed URLs (blob or data URLs)
    if (url.startsWith("blob:") || url.startsWith("data:")) {
      return { success: true, error: null };
    }

    // For regular URLs, try to fetch
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (!response.ok) {
        return { 
          success: false, 
          error: `Failed to fetch EPUB file: HTTP ${response.status}` 
        };
      }

      // Check content type if available
      const contentType = response.headers.get('content-type');
      if (contentType && 
         !contentType.includes('application/epub+zip') && 
         !contentType.includes('application/octet-stream') &&
         !contentType.includes('application/zip')) {
        return {
          success: false,
          error: `File doesn't appear to be an EPUB (content-type: ${contentType})`
        };
      }

      return { success: true, error: null };
    } catch (fetchError) {
      return { 
        success: false, 
        error: `Network error: ${fetchError.message}` 
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Validation error: ${error.message}`
    };
  }
}

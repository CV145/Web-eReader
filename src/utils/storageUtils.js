/**
 * Storage Utilities
 * Helper functions for dealing with localStorage, especially for large files
 */

/**
 * Maximum size for a single localStorage item (in bytes)
 * Most browsers limit it to around 5MB, but we'll use a conservative limit
 */
const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk

/**
 * Store a large string in localStorage by chunking it if necessary
 * @param {string} key - The base key to store the data under
 * @param {string} data - The data string to store (e.g., a base64 data URL)
 * @returns {boolean} - Whether the operation was successful
 */
export function storeWithChunking(key, data) {
  try {
    // Clear any existing chunks for this key
    clearChunks(key);
    
    // If data fits in a single chunk, store it directly
    if (data.length <= MAX_CHUNK_SIZE) {
      localStorage.setItem(key, data);
      return true;
    }
    
    // Store info about the chunked data
    const chunks = Math.ceil(data.length / MAX_CHUNK_SIZE);
    localStorage.setItem(`${key}_info`, JSON.stringify({
      chunked: true,
      chunks,
      totalLength: data.length,
      timestamp: Date.now()
    }));
    
    // Store the data in chunks
    for (let i = 0; i < chunks; i++) {
      const start = i * MAX_CHUNK_SIZE;
      const end = Math.min(start + MAX_CHUNK_SIZE, data.length);
      const chunk = data.substring(start, end);
      
      localStorage.setItem(`${key}_chunk_${i}`, chunk);
    }
    
    return true;
  } catch (error) {
    console.error('Error storing data with chunking:', error);
    
    // Clean up any partially stored chunks
    clearChunks(key);
    
    return false;
  }
}

/**
 * Retrieve data that might be stored in chunks
 * @param {string} key - The base key the data was stored under
 * @returns {string|null} - The retrieved data or null if not found
 */
export function retrieveWithChunking(key) {
  try {
    // Check if we have chunking info for this key
    const infoStr = localStorage.getItem(`${key}_info`);
    
    if (!infoStr) {
      // Not chunked, return the item directly
      return localStorage.getItem(key);
    }
    
    // Parse the chunking info
    const info = JSON.parse(infoStr);
    if (!info.chunked) {
      return localStorage.getItem(key);
    }
    
    // Retrieve and concatenate all chunks
    let result = '';
    for (let i = 0; i < info.chunks; i++) {
      const chunk = localStorage.getItem(`${key}_chunk_${i}`);
      if (!chunk) {
        console.error(`Missing chunk ${i} for ${key}`);
        return null;
      }
      result += chunk;
    }
    
    // Verify the length as a basic integrity check
    if (result.length !== info.totalLength) {
      console.warn(`Retrieved data length (${result.length}) doesn't match expected length (${info.totalLength})`);
    }
    
    return result;
  } catch (error) {
    console.error('Error retrieving chunked data:', error);
    return null;
  }
}

/**
 * Remove all chunks for a key
 * @param {string} key - The base key to clear chunks for
 */
export function clearChunks(key) {
  // First check if we have chunking info
  const infoStr = localStorage.getItem(`${key}_info`);
  
  if (infoStr) {
    try {
      const info = JSON.parse(infoStr);
      // Remove all chunks
      if (info.chunked) {
        for (let i = 0; i < info.chunks; i++) {
          localStorage.removeItem(`${key}_chunk_${i}`);
        }
      }
      // Remove the info
      localStorage.removeItem(`${key}_info`);
    } catch (e) {
      console.error('Error parsing chunk info during cleanup:', e);
    }
  }
  
  // Also remove the base item (if it exists)
  localStorage.removeItem(key);
}

/**
 * Check available localStorage space
 * @returns {number} - Approximate available space in bytes
 */
export function getAvailableStorageSpace() {
  try {
    // Start with a small test string
    const testKey = '_storage_test_';
    let testString = 'A'.repeat(1024); // 1KB string
    let space = 0;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    
    // Keep doubling the test string until it fails
    while (iterations < maxIterations) {
      try {
        localStorage.setItem(testKey, testString);
        space = testString.length;
        testString += testString; // Double the size
        iterations++;
      } catch (e) {
        break;
      }
    }
    
    // Clean up
    localStorage.removeItem(testKey);
    
    return space;
  } catch (e) {
    return 0;
  }
}

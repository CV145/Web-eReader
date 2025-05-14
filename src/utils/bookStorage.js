/**
 * Book Storage Utility
 * Handles restoring book data from localStorage
 */

import { retrieveWithChunking } from './storageUtils';
import { retrieveBookData, deleteBookData, isIndexedDBAvailable } from './indexedDbStorage';

/**
 * Restores books that were uploaded by the user from localStorage
 * @param {Array} books - The books array from the library store
 * @returns {Array} - Updated books array with restored URLs
 */
export async function restoreUploadedBooks(books) {
  // Create a copy of the books array to avoid mutating it directly
  const restoredBooks = [...books];
  
  for (let i = 0; i < restoredBooks.length; i++) {
    const book = restoredBooks[i];
    
    // All books are treated as user-uploaded books now
    
    console.log(`Checking book ${book.id}: ${book.title}`);
    
    // Try to restore from storage if the book needs restoration
    // Either the url is missing or it starts with 'blob:' (which is invalid after a page refresh)
    if (!book.url || book.url.startsWith('blob:')) {
      console.log(`Book ${book.id} needs restoration: url is ${book.url || 'missing'}`);
      
      const storageKey = `book_data_${book.id}`;
      let storedData = null;
      
      // Check if the book is marked as stored in IndexedDB
      if (book.storageType === 'indexeddb' && isIndexedDBAvailable()) {
        console.log(`Trying to restore ${book.id} from IndexedDB...`);
        try {
          storedData = await retrieveBookData(storageKey);
        } catch (e) {
          console.error(`Error restoring from IndexedDB:`, e);
        }
      }
      
      // Fall back to localStorage if no data was found in IndexedDB
      if (!storedData) {
        console.log(`Falling back to localStorage for ${book.id}...`);
        storedData = retrieveWithChunking(storageKey);
      }
      
      if (storedData) {
        console.log(`Found stored data for book ${book.id} (${storedData.substring(0, 50)}...)`);
        
        // Check if stored data is a valid data URL
        if (storedData.startsWith('data:')) {
          // Store the data URL directly - it will be used as is
          console.log(`Book ${book.id} restored with data URL`);
          restoredBooks[i] = { 
            ...book, 
            url: storedData,
            status: 'available'
          };
        } else {
          // This shouldn't happen but just in case
          console.warn(`Unexpected format for stored book data: ${book.id}`);
          restoredBooks[i] = {
            ...book,
            status: 'corrupt',
            statusMessage: 'Stored book data is in an unexpected format'
          };
        }
      } else {
        console.warn(`No stored data found for book: ${book.id}`);
        // Book is inaccessible now, but we keep it in the library with a status flag
        restoredBooks[i] = {
          ...book,
          status: 'unavailable',
          statusMessage: 'Book data no longer available'
        };
      }
    } else if (book.url && !book.url.startsWith('blob:')) {
      // Book already has a URL that's not a blob URL (likely a data URL), so it should be fine
      console.log(`Book ${book.id} already has a valid non-blob URL`);
      restoredBooks[i] = {
        ...book,
        status: 'available'
      };
    }
  }
  
  return restoredBooks;
}

/**
 * Checks if localStorage is usable and has enough space
 * @returns {Object} - Status of localStorage availability
 */
export function checkStorageAvailability() {
  const testKey = 'storage_test';
  
  try {
    // Try setting a test item
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    
    // Estimate available space (very rough estimation)
    let availableSpace = 0;
    try {
      // Fill with 1MB chunks until it fails
      const testString = new Array(1024 * 1024).join('a');
      let i = 0;
      
      while (i < 10) { // Limit to 10MB max test
        try {
          localStorage.setItem(`${testKey}_${i}`, testString);
          availableSpace += testString.length;
          i++;
        } catch (e) {
          break;
        }
      }
      
      // Clean up test items
      for (let j = 0; j < i; j++) {
        localStorage.removeItem(`${testKey}_${j}`);
      }
    } catch (e) {
      // This means we already filled the storage
    }
    
    // Convert to MB
    const availableMB = (availableSpace / (1024 * 1024)).toFixed(2);
    
    return { 
      available: true,
      availableMB: availableMB,
      message: `localStorage is available with approximately ${availableMB}MB of space`
    };
    
  } catch (e) {
    return { 
      available: false,
      availableMB: 0,
      message: 'localStorage is not available'
    };
  }
}

/**
 * IndexedDB Storage Utility
 * Provides functionality for storing and retrieving large book data using IndexedDB
 * This gives us much higher storage limits than localStorage (typically 50MB+ or unlimited)
 */

// Database configuration
const DB_NAME = 'webEreaderDb';
const DB_VERSION = 1;
const BOOK_STORE = 'books';

/**
 * Open a connection to the IndexedDB
 * @returns {Promise<IDBDatabase>} A promise that resolves to the database connection
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      reject(new Error('Error opening IndexedDB: ' + event.target.error));
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    // Create object store on first run or version upgrade
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create the books object store if it doesn't exist
      if (!db.objectStoreNames.contains(BOOK_STORE)) {
        const objectStore = db.createObjectStore(BOOK_STORE, { keyPath: 'id' });
        objectStore.createIndex('id', 'id', { unique: true });
      }
    };
  });
}

/**
 * Store book data in IndexedDB
 * @param {string} bookId - The unique ID of the book
 * @param {string} bookData - The book data (typically a base64 data URL)
 * @returns {Promise<boolean>} A promise that resolves to true on success
 */
export async function storeBookData(bookId, bookData) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE], 'readwrite');
      
      transaction.onerror = (event) => {
        reject(new Error('Transaction error: ' + event.target.error));
      };
      
      const objectStore = transaction.objectStore(BOOK_STORE);
      
      // Book record to store
      const bookRecord = {
        id: bookId,
        data: bookData,
        timestamp: Date.now()
      };
      
      // Add or update the book data
      const request = objectStore.put(bookRecord);
      
      request.onsuccess = () => {
        console.log(`Book ${bookId} successfully stored in IndexedDB`);
        resolve(true);
      };
      
      request.onerror = (event) => {
        reject(new Error('Error storing book in IndexedDB: ' + event.target.error));
      };
    });
  } catch (error) {
    console.error('IndexedDB storage error:', error);
    return false;
  }
}

/**
 * Retrieve book data from IndexedDB
 * @param {string} bookId - The unique ID of the book to retrieve
 * @returns {Promise<string|null>} A promise that resolves to the book data or null if not found
 */
export async function retrieveBookData(bookId) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE], 'readonly');
      const objectStore = transaction.objectStore(BOOK_STORE);
      
      const request = objectStore.get(bookId);
      
      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result) {
          console.log(`Book ${bookId} successfully retrieved from IndexedDB`);
          resolve(result.data);
        } else {
          console.log(`Book ${bookId} not found in IndexedDB`);
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        reject(new Error('Error retrieving book from IndexedDB: ' + event.target.error));
      };
    });
  } catch (error) {
    console.error('IndexedDB retrieval error:', error);
    return null;
  }
}

/**
 * Delete book data from IndexedDB
 * @param {string} bookId - The unique ID of the book to delete
 * @returns {Promise<boolean>} A promise that resolves to true on success
 */
export async function deleteBookData(bookId) {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE], 'readwrite');
      const objectStore = transaction.objectStore(BOOK_STORE);
      
      const request = objectStore.delete(bookId);
      
      request.onsuccess = () => {
        console.log(`Book ${bookId} successfully deleted from IndexedDB`);
        resolve(true);
      };
      
      request.onerror = (event) => {
        reject(new Error('Error deleting book from IndexedDB: ' + event.target.error));
      };
    });
  } catch (error) {
    console.error('IndexedDB deletion error:', error);
    return false;
  }
}

/**
 * Check if IndexedDB is available in the browser
 * @returns {boolean} Whether IndexedDB is available
 */
export function isIndexedDBAvailable() {
  return !!window.indexedDB;
}

/**
 * List all books stored in IndexedDB
 * @returns {Promise<Array>} A promise that resolves to an array of book IDs
 */
export async function listStoredBooks() {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BOOK_STORE], 'readonly');
      const objectStore = transaction.objectStore(BOOK_STORE);
      const books = [];
      
      const request = objectStore.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          books.push({
            id: cursor.value.id,
            timestamp: cursor.value.timestamp
          });
          cursor.continue();
        } else {
          resolve(books);
        }
      };
      
      request.onerror = (event) => {
        reject(new Error('Error listing books from IndexedDB: ' + event.target.error));
      };
    });
  } catch (error) {
    console.error('IndexedDB list error:', error);
    return [];
  }
}

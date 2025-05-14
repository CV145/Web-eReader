/**
 * Store Helper Utility
 * Provides helper functions for managing store persistence
 */

/**
 * Force a Pinia store to save its state to localStorage immediately
 * This is useful after operations like deletion where we want to ensure
 * the state is saved before the user navigates away or refreshes
 * 
 * @param {Object} store - The Pinia store instance
 */
export function forcePersist(store) {
  // Only proceed if the store has a $persist method
  if (typeof store.$persist === 'function') {
    try {
      // Manually trigger persistence
      store.$persist();
      console.log('Store state manually persisted');
      
      // Double verification: directly interact with localStorage
      // This ensures the state is actually written to localStorage
      const storeKey = `pinia-${store.$id}`;
      const currentState = JSON.stringify(store.$state);
      localStorage.setItem(storeKey, currentState);
      
      console.log(`Direct localStorage persistence for ${storeKey} complete`);
      return true;
    } catch (error) {
      console.error('Error forcing store persistence:', error);
      return false;
    }
  } else {
    console.warn('Store does not have a $persist method');
    return false;
  }
}

/**
 * Verify that a specific ID is not present in a store's books array
 * This can be used to ensure a book was actually removed
 * 
 * @param {Object} store - The library store instance
 * @param {String} bookId - The ID of the book to check
 * @returns {Boolean} - True if the book is completely removed
 */
export function verifyBookRemoved(store, bookId) {
  // Check in the books array
  const bookExists = store.books.some(book => book.id === bookId);
  
  // Check in all collections
  const inCollections = store.collections.some(collection => 
    collection.bookIds.includes(bookId)
  );
  
  // Check if it's the current book
  const isCurrentBook = store.currentBookId === bookId;
  
  const completelyRemoved = !bookExists && !inCollections && !isCurrentBook;
  
  if (!completelyRemoved) {
    console.warn(`Book ${bookId} still exists in store:`, {
      inBooksArray: bookExists,
      inCollections: inCollections, 
      isCurrentBook: isCurrentBook
    });
  }
  
  return completelyRemoved;
}

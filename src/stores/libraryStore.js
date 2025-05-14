import { defineStore } from 'pinia'

export const useLibraryStore = defineStore('library', {
  state: () => ({
    books: [
      // Only include actual downloaded books
      {
        id: 'alice',
        title: "Alice's Adventures in Wonderland",
        author: 'Lewis Carroll',
        cover: null,
        format: 'epub',
        filePath: '/books/alice.epub', // Relative path from public directory
        progress: 0, // Reading progress percentage
        lastRead: null,
        favorite: false,
        addedDate: new Date().toISOString(),
      },
    ],
    currentBookId: null, // ID of the currently open book
    collections: [
      { id: 'favorites', name: 'Favorites', bookIds: [] },
      { id: 'to-read', name: 'To Read', bookIds: ['alice'] },
    ],
  }),
  
  getters: {
    // Get all books from the library
    getBooks: (state) => state.books,
    
    // Get a specific book by ID
    getBookById: (state) => (id) => {
      return state.books.find(book => book.id === id)
    },
    
    // Get currently reading book
    getCurrentBook: (state) => {
      if (!state.currentBookId) return null
      return state.books.find(book => book.id === state.currentBookId)
    },
    
    // Get books in a specific collection
    getBooksInCollection: (state) => (collectionId) => {
      const collection = state.collections.find(c => c.id === collectionId)
      if (!collection) return []
      return state.books.filter(book => collection.bookIds.includes(book.id))
    },
    
    // Get favorite books
    getFavoriteBooks: (state) => {
      return state.books.filter(book => book.favorite)
    },
    
    // Get recently read books (sorted by last read date)
    getRecentlyReadBooks: (state) => {
      return [...state.books]
        .filter(book => book.lastRead)
        .sort((a, b) => new Date(b.lastRead) - new Date(a.lastRead))
        .slice(0, 5) // Limit to 5 most recent
    },
  },
  
  actions: {
    // Add a new book to the library
    addBook(book) {
      // Generate a unique ID if none provided
      if (!book.id) {
        book.id = Date.now().toString()
      }
      
      // Set default values for missing properties
      const newBook = {
        progress: 0,
        lastRead: null,
        favorite: false,
        addedDate: new Date().toISOString(),
        ...book
      }
      
      this.books.push(newBook)
      return newBook.id
    },
    
    // Remove a book from the library
    removeBook(id) {
      // Remove the book from all collections
      this.collections.forEach(collection => {
        collection.bookIds = collection.bookIds.filter(bookId => bookId !== id)
      })
      
      // Remove the book itself
      this.books = this.books.filter(book => book.id !== id)
      
      // Reset currentBookId if it was the removed book
      if (this.currentBookId === id) {
        this.currentBookId = null
      }
    },
    
    // Update book details
    updateBook(id, updates) {
      const bookIndex = this.books.findIndex(book => book.id === id)
      if (bookIndex !== -1) {
        this.books[bookIndex] = { ...this.books[bookIndex], ...updates }
      }
    },
    
    // Set the current book being read
    setCurrentBook(id) {
      this.currentBookId = id
      
      // Update last read timestamp
      const bookIndex = this.books.findIndex(book => book.id === id)
      if (bookIndex !== -1) {
        this.books[bookIndex].lastRead = new Date().toISOString()
      }
    },
    
    // Update reading progress for a book
    updateReadingProgress(id, progressPercentage) {
      const bookIndex = this.books.findIndex(book => book.id === id)
      if (bookIndex !== -1) {
        this.books[bookIndex].progress = progressPercentage
        this.books[bookIndex].lastRead = new Date().toISOString()
      }
    },
    
    // Toggle favorite status for a book
    toggleFavorite(id) {
      const bookIndex = this.books.findIndex(book => book.id === id)
      if (bookIndex !== -1) {
        this.books[bookIndex].favorite = !this.books[bookIndex].favorite
        
        // Update favorites collection
        const favoritesCollection = this.collections.find(c => c.id === 'favorites')
        if (favoritesCollection) {
          if (this.books[bookIndex].favorite) {
            // Add to favorites if not already there
            if (!favoritesCollection.bookIds.includes(id)) {
              favoritesCollection.bookIds.push(id)
            }
          } else {
            // Remove from favorites
            favoritesCollection.bookIds = favoritesCollection.bookIds.filter(bookId => bookId !== id)
          }
        }
      }
    },
    
    // Create a new collection
    addCollection(name) {
      const id = name.toLowerCase().replace(/\s+/g, '-')
      this.collections.push({
        id,
        name,
        bookIds: []
      })
      return id
    },
    
    // Add a book to a collection
    addBookToCollection(bookId, collectionId) {
      const collection = this.collections.find(c => c.id === collectionId)
      if (collection && !collection.bookIds.includes(bookId)) {
        collection.bookIds.push(bookId)
      }
    },
    
    // Remove a book from a collection
    removeBookFromCollection(bookId, collectionId) {
      const collection = this.collections.find(c => c.id === collectionId)
      if (collection) {
        collection.bookIds = collection.bookIds.filter(id => id !== bookId)
      }
    }
  },
  
  // Enable data persistence
  persist: true,
})

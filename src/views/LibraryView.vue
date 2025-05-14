<template>
  <div class="library">
    <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md min-h-[70vh]">
      <h1 class="text-3xl font-bold mb-6">Your Library</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Display books from the store -->
        <div 
          v-for="book in books" 
          :key="book.id" 
          class="book-item bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="aspect-w-2 aspect-h-3 bg-gray-200 mb-3 rounded relative">
            <div class="flex items-center justify-center h-full text-gray-400">
              Book Cover
            </div>
            <!-- Favorite badge -->
            <button 
              @click="toggleFavorite(book.id)"
              class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
              :class="{ 'text-red-500': book.favorite }"
            >
              <span v-if="book.favorite">★</span>
              <span v-else>☆</span>
            </button>
          </div>
          
          <h3 class="font-medium">{{ book.title }}</h3>
          <p class="text-sm text-gray-600">{{ book.author }}</p>
          
          <!-- Progress bar if started reading -->
          <div v-if="book.progress > 0" class="mt-2">
            <div class="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                class="bg-indigo-600 h-1.5 rounded-full" 
                :style="{ width: `${book.progress}%` }"
              ></div>
            </div>
            <p class="text-xs text-gray-500 mt-1">{{ book.progress }}% read</p>
          </div>
          
          <div class="mt-3 flex space-x-2">
            <router-link 
              :to="'/reader'" 
              class="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
              @click="openBook(book.id)"
            >
              Read
            </router-link>
            <button 
              class="text-sm bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
              @click="showBookInfo(book.id)"
            >
              Info
            </button>
          </div>
        </div>
      </div>
      
      <div class="mt-8">
        <router-link 
          to="/" 
          class="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors mr-4"
        >
          Back to Home
        </router-link>
        
        <router-link 
          to="/reader" 
          class="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Open Reader
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useLibraryStore } from '../stores/libraryStore'
import { useRouter } from 'vue-router'

const router = useRouter()
const libraryStore = useLibraryStore()

// Get books from the store
const books = libraryStore.getBooks

// Book actions
const openBook = (bookId) => {
  libraryStore.setCurrentBook(bookId)
  // Router navigation happens via the router-link
}

const toggleFavorite = (bookId) => {
  libraryStore.toggleFavorite(bookId)
}

const showBookInfo = (bookId) => {
  // For now, we'll just show a simple alert with book info
  const book = libraryStore.getBookById(bookId)
  alert(`Title: ${book.title}\nAuthor: ${book.author}\nFormat: ${book.format}\nAdded: ${new Date(book.addedDate).toLocaleDateString()}`)
  
  // In the future, this could open a modal with more details
}
</script>

<template>
  <div class="reader" :class="{ 'dark-mode': isDarkMode }">
    <div class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md min-h-[70vh] reader-container" :style="readerStyle">
      <!-- Reading controls toolbar -->
      <div class="flex justify-between items-center mb-6 pb-4 border-b">
        <div class="flex items-center space-x-2">
          <router-link 
            to="/library" 
            class="inline-block bg-gray-200 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-300 transition-colors text-sm"
          >
            Back to Library
          </router-link>
          <span class="text-sm text-gray-500">{{ currentBookTitle }}</span>
        </div>
        
        <div class="settings-controls flex items-center space-x-4">
          <!-- Font size controls -->
          <div class="flex items-center space-x-2">
            <button @click="decreaseFontSize" class="p-1 rounded hover:bg-gray-100">
              <span class="text-lg">A-</span>
            </button>
            <button @click="increaseFontSize" class="p-1 rounded hover:bg-gray-100">
              <span class="text-lg">A+</span>
            </button>
          </div>
          
          <!-- Theme toggle -->
          <button @click="toggleTheme" class="p-1 rounded hover:bg-gray-100">
            <span v-if="isDarkMode" class="text-lg">☀️</span>
            <span v-else class="text-lg">🌙</span>
          </button>
        </div>
      </div>
      
      <div v-if="!currentBook" class="text-center py-8 reader-content prose mx-auto" :style="contentStyle">
        <p class="text-lg text-gray-600">No book is currently open</p>
        <router-link 
          to="/library" 
          class="inline-block mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Go to Library
        </router-link>
      </div>
      
      <div v-else class="reader-view">
        <!-- EPUB Renderer Component -->
        <EpubRenderer 
          :url="currentEpubUrl" 
          :theme="settingsStore.theme" 
          :fontSize="settingsStore.fontSize" 
          :fontFamily="settingsStore.fontFamily" 
          :lineHeight="settingsStore.lineSpacing"
          @progress-update="handleProgressUpdate"
          @book-loaded="handleBookLoaded"
          @error="handleError"
        />

        <!-- Book info overlay (can be toggled) -->
        <div v-if="showBookInfo" class="book-info-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 class="text-xl font-bold mb-4">{{ currentBook.title }}</h2>
            <p class="mb-2"><strong>Author:</strong> {{ currentBook.author }}</p>
            <p class="mb-2"><strong>Format:</strong> {{ currentBook.format }}</p>
            <p class="mb-2"><strong>Reading Progress:</strong> {{ readingProgress }}%</p>
            <p class="mb-4"><strong>Added:</strong> {{ new Date(currentBook.addedDate).toLocaleDateString() }}</p>
            
            <div class="flex justify-end">
              <button 
                @click="showBookInfo = false" 
                class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settingsStore'
import { useLibraryStore } from '../stores/libraryStore'
import EpubRenderer from '../components/EpubRenderer.vue'

const settingsStore = useSettingsStore()
const libraryStore = useLibraryStore()

// Get the currently open book
const currentBook = computed(() => libraryStore.getCurrentBook)
const currentBookTitle = computed(() => currentBook.value?.title || 'No book open')

// Book info modal
const showBookInfo = ref(false)

// Reading progress
const readingProgress = ref(0)

// EPUB file URL - for now we're using a sample EPUB file
const currentEpubUrl = computed(() => {
  // If there's a real book URL in the future, use that
  // For now, return the sample EPUB for all books
  return '/books/alice.epub'
})

onMounted(() => {
  // Set initial reading progress if a book is open
  if (currentBook.value) {
    readingProgress.value = currentBook.value.progress
  }
})

// Settings computed properties
const isDarkMode = computed(() => settingsStore.isDarkMode)

const readerStyle = computed(() => {
  return {
    'background-color': isDarkMode.value ? '#1a1a1a' : 'white',
    'color': isDarkMode.value ? '#e0e0e0' : 'inherit',
    'transition': 'background-color 0.3s, color 0.3s',
    'padding': settingsStore.marginSize
  }
})

const contentStyle = computed(() => {
  return {
    'font-size': `${settingsStore.fontSize}px`,
    'font-family': settingsStore.fontFamily,
    'line-height': settingsStore.lineSpacing,
  }
})

// Settings actions
const increaseFontSize = () => {
  settingsStore.increaseFontSize()
}

const decreaseFontSize = () => {
  settingsStore.decreaseFontSize()
}

const toggleTheme = () => {
  settingsStore.toggleTheme()
}

// EPUB reader event handlers
const handleProgressUpdate = (data) => {
  if (currentBook.value) {
    // Update local reading progress
    readingProgress.value = data.progress
    // Update progress in the store
    libraryStore.updateReadingProgress(currentBook.value.id, data.progress)
  }
}

const handleBookLoaded = (metadata) => {
  console.log('Book loaded:', metadata)
}

const handleError = (error) => {
  console.error('Error in EPUB reader:', error)
}

// Book info actions
const toggleBookInfo = () => {
  showBookInfo.value = !showBookInfo.value
}
</script>

<style scoped>
.dark-mode .reader-container {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

.dark-mode button {
  background-color: #333;
  color: #e0e0e0;
}

.dark-mode button:hover {
  background-color: #444;
}

.author {
  font-style: italic;
  margin-top: -1rem;
  margin-bottom: 2rem;
  color: #666;
}

.dark-mode .author {
  color: #aaa;
}
</style>

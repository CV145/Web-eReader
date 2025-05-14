<template>
  <div class="epub-container relative">
    <!-- Loading indicator -->
    <div v-if="loading" class="loading-indicator absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10">
      <div class="text-center">
        <svg class="animate-spin h-8 w-8 mx-auto text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-2">Loading book...</p>
      </div>
    </div>

    <!-- EPUB viewer -->
    <div class="viewer" ref="viewerRef"></div>

    <!-- Navigation controls -->
    <div class="navigation-controls absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
      <button 
        @click="prevPage" 
        class="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors shadow"
      >
        Previous
      </button>
      <button 
        @click="nextPage" 
        class="bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors shadow"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, defineProps, defineEmits, watch } from 'vue'
import ePub from 'epubjs'

const props = defineProps({
  url: {
    type: String,
    required: true
  },
  theme: {
    type: String,
    default: 'light'
  },
  fontSize: {
    type: Number,
    default: 16
  },
  fontFamily: {
    type: String,
    default: 'Georgia'
  },
  lineHeight: {
    type: Number,
    default: 1.5
  }
})

const emit = defineEmits(['progress-update', 'book-loaded', 'error'])

const viewerRef = ref(null)
const book = ref(null)
const rendition = ref(null)
const loading = ref(true)
const currentLocation = ref(null)
const totalPages = ref(0)
const currentPage = ref(0)

// Initialize the EPUB book
const initBook = async () => {
  try {
    loading.value = true
    
    // Create book instance
    book.value = ePub(props.url)
    
    // Create rendition
    rendition.value = book.value.renderTo(viewerRef.value, {
      width: '100%',
      height: '100%',
      spread: 'none'
    })
    
    // Apply styling
    applyStyles()
    
    // Load the book and display
    await rendition.value.display()
    
    // Set up event listeners
    setupEventListeners()
    
    // Get book metadata
    const metadata = await book.value.loaded.metadata
    
    // Calculate total number of pages (approximation)
    book.value.locations.generate(1024).then(() => {
      totalPages.value = book.value.locations.total
      emit('book-loaded', { 
        title: metadata.title,
        creator: metadata.creator,
        totalPages: totalPages.value
      })
    })
    
    loading.value = false
  } catch (error) {
    console.error('Error loading EPUB:', error)
    loading.value = false
    emit('error', error)
  }
}

// Apply CSS styles to the book content
const applyStyles = () => {
  if (!rendition.value) return
  
  // Apply theme and font settings
  const theme = {
    body: {
      'font-family': props.fontFamily,
      'font-size': `${props.fontSize}px`,
      'line-height': props.lineHeight,
      'color': props.theme === 'dark' ? '#e0e0e0' : '#333',
      'background-color': props.theme === 'dark' ? '#1a1a1a' : '#fff',
      'padding': '0 20px'
    },
    'p': {
      'margin': '0.5em 0'
    },
    'h1, h2, h3, h4, h5, h6': {
      'margin': '1em 0 0.5em'
    }
  }
  
  rendition.value.themes.register('default', theme)
  rendition.value.themes.select('default')
}

// Set up event listeners for the EPUB book
const setupEventListeners = () => {
  if (!rendition.value) return
  
  rendition.value.on('locationChanged', (location) => {
    currentLocation.value = location
    
    if (book.value.locations.total) {
      const progress = book.value.locations.percentageFromCfi(location.start.cfi)
      currentPage.value = Math.round(progress * totalPages.value)
      
      emit('progress-update', {
        currentLocation: location,
        currentPage: currentPage.value,
        totalPages: totalPages.value,
        progress: Math.round(progress * 100)
      })
    }
  })
  
  // Handle keyboard navigation
  rendition.value.on('keyup', (event) => {
    if (event.key === 'ArrowLeft') {
      prevPage()
    } else if (event.key === 'ArrowRight') {
      nextPage()
    }
  })
}

// Navigate to the previous page
const prevPage = () => {
  if (rendition.value) {
    rendition.value.prev()
  }
}

// Navigate to the next page
const nextPage = () => {
  if (rendition.value) {
    rendition.value.next()
  }
}

// Update styles when props change
watch(() => props.theme, applyStyles)
watch(() => props.fontSize, applyStyles)
watch(() => props.fontFamily, applyStyles)
watch(() => props.lineHeight, applyStyles)

// Initialize when component is mounted
onMounted(() => {
  initBook()
})

// Clean up when component is unmounted
onBeforeUnmount(() => {
  if (book.value) {
    book.value.destroy()
  }
})
</script>

<style scoped>
.epub-container {
  width: 100%;
  height: 70vh;
  position: relative;
  overflow: hidden;
  border-radius: 0.375rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.viewer {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.navigation-controls {
  opacity: 0.8;
  transition: opacity 0.3s;
}

.epub-container:hover .navigation-controls {
  opacity: 1;
}

/* Override epub.js default styles */
:deep(.epub-view) {
  padding: 0;
}

:deep(iframe) {
  border: none;
  width: 100%;
  height: 100%;
}
</style>

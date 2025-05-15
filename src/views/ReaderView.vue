<template>
  <div class="reader" :class="{ 'dark-mode': isDarkMode }">
    <div
      class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md min-h-[70vh] reader-container"
      :style="readerStyle"
    >
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
            <button
              @click="decreaseFontSize"
              class="p-1 rounded hover:bg-gray-100"
            >
              <span class="text-lg">A-</span>
            </button>
            <button
              @click="increaseFontSize"
              class="p-1 rounded hover:bg-gray-100"
            >
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

      <div
        v-if="!currentBook"
        class="text-center py-8 reader-content prose mx-auto"
        :style="contentStyle"
      >
        <p class="text-lg text-gray-600">No book is currently open</p>
        <router-link
          to="/library"
          class="inline-block mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Go to Library
        </router-link>
      </div>

      <div v-else class="reader-view relative">
        <!-- Sticky navbar that follows scrolling -->
        <div class="sticky-navbar fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-md transition-all duration-300" 
             :class="{ 'opacity-100': isNavbarVisible, 'opacity-0 pointer-events-none': !isNavbarVisible }">
          <div class="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
            <!-- Left section: back button -->
            <div>
              <router-link to="/library" class="flex items-center text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                <span class="mr-1">←</span> Back to Library
              </router-link>
            </div>
            
            <!-- Center section: page navigation -->
            <div class="flex items-center space-x-4">
              <button @click="prevPage" class="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <span class="text-xl">←</span>
              </button>
              <div class="flex flex-col items-center min-w-[150px]">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{{ currentChapterTitle || 'Chapter' }}</span>
                <span class="text-xs text-gray-600 dark:text-gray-400">{{ progressPercentage }}</span>
              </div>
              <button @click="nextPage" class="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <span class="text-xl">→</span>
              </button>
            </div>
            
            <!-- Right section: settings -->
            <div class="flex items-center space-x-3">
              <button @click="decreaseFontSize" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Decrease font size">
                <span class="text-lg">A-</span>
              </button>
              <button @click="increaseFontSize" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Increase font size">
                <span class="text-lg">A+</span>
              </button>
              <button @click="toggleParagraphNumbering" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle paragraph numbers">
                <span class="text-lg">#</span>
              </button>
              <button @click="toggleTheme" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Toggle dark mode">
                <span class="text-lg">{{ isDarkMode ? '☀️' : '🌙' }}</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Custom EPUB Reader Component -->
        <!-- Loading state when book URL is not yet loaded -->
        <div v-if="!bookUrl" class="flex flex-col items-center justify-center h-64 mt-8">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p class="text-gray-600">Loading book data...</p>
        </div>
        
        <!-- Only render the reader component when bookUrl is available -->
        <CustomEpubReader 
          v-if="bookUrl"
          ref="epubReader"
          :bookId="currentBook.id"
          :bookTitle="currentBook.title"
          :bookUrl="bookUrl"
          :theme="settingsStore.theme" 
          :fontSize="settingsStore.fontSize"
          @progress-update="handleProgressUpdate"
          @book-loaded="handleBookLoaded"
          @book-load-error="handleBookLoadError"
          @font-size-change="updateFontSize"
          @theme-toggle="handleThemeToggle"
        />

        <!-- Book info overlay (can be toggled) -->
        <div
          v-if="showBookInfo"
          class="book-info-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <div
            class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full"
          >
            <h2 class="text-xl font-bold mb-4">{{ currentBook.title }}</h2>
            <p class="mb-2">
              <strong>Author:</strong> {{ currentBook.author }}
            </p>
            <p class="mb-2">
              <strong>Format:</strong> {{ currentBook.format }}
            </p>
            <p class="mb-2">
              <strong>Reading Progress:</strong> {{ readingProgress }}%
            </p>
            <p class="mb-4">
              <strong>Added:</strong>
              {{ new Date(currentBook.addedDate).toLocaleDateString() }}
            </p>

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
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useLibraryStore } from '../stores/libraryStore';
import { useSettingsStore } from '../stores/settingsStore';
import CustomEpubReader from '../components/CustomEpubReader.vue';
import { retrieveWithChunking } from '../utils/storageUtils';
import { isIndexedDBAvailable, retrieveBookData } from '../utils/indexedDbStorage';

const settingsStore = useSettingsStore();
const libraryStore = useLibraryStore();

// Get the currently open book
const currentBook = computed(() => {
  return libraryStore.getCurrentBook;
});

// Computed property for progress percentage
const progressPercentage = computed(() => {
  if (currentBook.value && typeof currentBook.value.progress === 'number') {
    console.log('Current progress from book:', currentBook.value.progress);
    return Math.round(currentBook.value.progress * 100) + '%';
  }
  return '0%';
});

// Reactive variable to store the resolved book URL
const bookUrl = ref('');
const currentBookTitle = computed(
  () => currentBook.value?.title || "No book open"
);

// Reactive variables for UI state
const isNavbarVisible = ref(true);
const lastScrollTop = ref(0);
const epubReader = ref(null); // Reference to the epub reader component
const currentChapterTitle = ref(''); // Current chapter title

// Book info modal
const showBookInfo = ref(false);

// Reading progress
const readingProgress = ref(0);

// For development, we'll directly use a static path to the EPUB file
// In a production app, we would use a more sophisticated approach
const currentEpubUrl = computed(() => {
  // For development/testing, use a direct path that we know works
  return "/src/assets/alice.epub";
});

// Function to load the book URL asynchronously
const loadBookUrl = async (book) => {
  if (!book) {
    console.log('No book provided to loadBookUrl');
    bookUrl.value = '';
    return;
  }
  
  console.log(`Starting to load URL for book: ${book.title} (ID: ${book.id})`);
  
  try {
    const url = await getBookUrl(book);
    console.log(`Book URL loaded for ${book.title}: ${url ? `${url.substring(0, 30)}...` : 'undefined'}`);
    
    if (url) {
      bookUrl.value = url;
      console.log('Book URL loaded successfully');
    } else {
      console.warn(`No URL returned for book ${book.title}`);
      bookUrl.value = '';
    }
  } catch (error) {
    console.error(`Error loading book URL for ${book.title}:`, error);
    bookUrl.value = '';
  }
};

// Watch for changes to the current book
watch(currentBook, (newBook) => {
  if (newBook) {
    loadBookUrl(newBook);
  } else {
    bookUrl.value = '';
  }
});

// Handle page navigation
const nextPage = () => {
  if (epubReader.value) {
    console.log('Navigating to next page');
    epubReader.value.nextChapter();
  } else {
    console.warn('EpubReader component not found');
  }
};

const prevPage = () => {
  if (epubReader.value) {
    console.log('Navigating to previous page');
    epubReader.value.prevChapter();
  } else {
    console.warn('EpubReader component not found');
  }
};

const toggleParagraphNumbering = () => {
  if (epubReader.value) {
    console.log('Toggling paragraph numbering');
    epubReader.value.toggleParagraphNumbering();
  } else {
    console.warn('EpubReader component not found');
  }
};

// Handle keyboard navigation
const handleKeyDown = (e) => {
  // Only handle keyboard events when a book is open and the reader component is loaded
  if (!currentBook.value || !bookUrl || !epubReader.value) return;
  
  console.log('Key pressed:', e.key);
  
  if (e.key === 'ArrowRight') {
    console.log('Right arrow key detected');
    e.preventDefault(); // Prevent default browser behavior
    nextPage();
  } else if (e.key === 'ArrowLeft') {
    console.log('Left arrow key detected');
    e.preventDefault(); // Prevent default browser behavior
    prevPage();
  }
};

// Handle scroll event to show/hide navbar
const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Show navbar when scrolling up, hide when scrolling down
  if (scrollTop > lastScrollTop.value && scrollTop > 50) {
    // Scrolling down & past threshold - hide navbar
    isNavbarVisible.value = false;
  } else {
    // Scrolling up or at top - show navbar
    isNavbarVisible.value = true;
  }
  
  lastScrollTop.value = scrollTop;
};

onMounted(() => {
  // Set initial reading progress if a book is open
  if (currentBook.value) {
    readingProgress.value = currentBook.value.progress;
    loadBookUrl(currentBook.value);
  }
  
  // Add event listeners for keyboard navigation and scroll
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('scroll', handleScroll);
});

onBeforeUnmount(() => {
  // Clean up event listeners
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('scroll', handleScroll);
});

// Settings computed properties
const isDarkMode = computed(() => settingsStore.isDarkMode);

const readerStyle = computed(() => {
  return {
    "background-color": isDarkMode.value ? "#1a1a1a" : "white",
    color: isDarkMode.value ? "#e0e0e0" : "inherit",
    transition: "background-color 0.3s, color 0.3s",
    padding: settingsStore.marginSize,
  };
});

const contentStyle = computed(() => {
  return {
    "font-size": `${settingsStore.fontSize}px`,
    "font-family": settingsStore.fontFamily,
    "line-height": settingsStore.lineSpacing,
  };
});

// Settings actions
const increaseFontSize = () => {
  settingsStore.increaseFontSize();
};

const decreaseFontSize = () => {
  settingsStore.decreaseFontSize();
};

const toggleTheme = () => {
  settingsStore.toggleTheme();
};

// EPUB reader event handlers
const handleProgressUpdate = (data) => {
  if (!currentBook.value) return;
  
  console.log('Progress update received:', data);
  
  // Update local reading progress
  readingProgress.value = data.progress;
  console.log('Setting readingProgress.value to:', data.progress);
  
  // Update chapter title if available
  if (data.chapterTitle) {
    currentChapterTitle.value = data.chapterTitle;
    console.log('Current chapter title updated:', data.chapterTitle);
  }
  
  // Get the book ID
  const bookId = currentBook.value.id;
  console.log(`Updating progress for book ${bookId} to ${data.progress}`);
  
  // Update progress in the store
  libraryStore.updateReadingProgress(bookId, data.progress);
  
  // Log current progress from store after update
  console.log('After update - Book progress from store:', libraryStore.getBookById(bookId)?.progress);
};

const handleBookLoaded = (metadata) => {
  console.log("Book loaded:", metadata);
};

// Handle errors when loading the book
const handleBookLoadError = (error) => {
  console.error("Error loading book:", error);
  // You could also show a notification to the user here
};

// Handle font size change event from VueReaderComponent
const updateFontSize = (newSize) => {
  settingsStore.fontSize = newSize;
};

// Handle theme toggle event from VueReaderComponent
const handleThemeToggle = () => {
  settingsStore.toggleTheme();
};

// Get the correct book URL based on book source
const getBookUrl = async (book) => {
  if (!book || !book.id) {
    console.error('Invalid book object provided to getBookUrl');
    return '';
  }

  console.log(`Trying to load book ${book.id} data from storage...`);
  
  // First try IndexedDB for large books
  if (isIndexedDBAvailable()) {
    try {
      const storageKey = `book_data_${book.id}`;
      const data = await retrieveBookData(storageKey);
      if (data) {
        console.log(`ReaderView: Found data for ${book.id} in IndexedDB`);
        // Validate that it's a usable URL format
        if (typeof data === 'string' && (data.startsWith('data:') || data.startsWith('blob:') || data.startsWith('http'))) {
          console.log(`Book URL loaded for ${book.id} in IndexedDB`);
          return data;
        } else {
          console.warn(`IndexedDB data for ${book.id} is not in expected URL format:`, typeof data);
        }
      }
    } catch (err) {
      console.warn(`ReaderView: Error getting data from IndexedDB for ${book.id}:`, err);
      // Continue to localStorage if IndexedDB fails
    }
  }
  
  // Try localStorage (with chunking for large books)
  const storageKey = `book_data_${book.id}`;
  const storedData = retrieveWithChunking(storageKey);
  
  if (storedData) {
    console.log(`ReaderView: Found data for book ${book.id} in localStorage`);
    
    // If it's already a data URL, return it directly
    if (typeof storedData === 'string' && storedData.startsWith('data:')) {
      console.log(`Book URL loaded for ${book.id} from localStorage as data URL`);
      return storedData;
    }
    
    // Otherwise, try to use it directly if it's a string
    if (typeof storedData === 'string') {
      console.log(`Book URL loaded for ${book.id} from localStorage as string`);
      return storedData;
    } else {
      console.error(`ReaderView: Stored data for book ${book.id} is not a string:`, typeof storedData);
    }
  }
  
  // Try using existing URL if available
  if (book.url) {
    // If it's a blob URL, it has likely expired after page refresh
    if (book.url.startsWith('blob:')) {
      console.warn(`ReaderView: Blob URL for ${book.id} likely expired`);
    } else {
      // If it's not a blob URL (e.g., it's a data URL), we can still use it
      console.log(`ReaderView: Using existing URL for ${book.id}`);
      return book.url;
    }
  }
  
  // If we get here, we couldn't find the book data
  console.error(`Book data for ${book.id} not found in any storage.`);
  return '';
};

// Book info actions
const toggleBookInfo = () => {
  showBookInfo.value = !showBookInfo.value;
};
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

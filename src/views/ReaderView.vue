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

      <div v-else class="reader-view">
        <!-- Custom EPUB Reader Component -->
        <!-- Loading state when book URL is not yet loaded -->
        <div v-if="!bookUrl" class="flex flex-col items-center justify-center h-64 mt-8">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p class="text-gray-600">Loading book data...</p>
        </div>
        
        <!-- Only render the reader component when bookUrl is available -->
        <CustomEpubReader 
          v-if="bookUrl"
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
import { ref, computed, watch, onMounted } from 'vue';
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

// Reactive variable to store the resolved book URL
const bookUrl = ref('');
const currentBookTitle = computed(
  () => currentBook.value?.title || "No book open"
);

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

onMounted(() => {
  // Set initial reading progress if a book is open
  if (currentBook.value) {
    readingProgress.value = currentBook.value.progress;
    loadBookUrl(currentBook.value);
  }
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
  if (currentBook.value) {
    // Update local reading progress
    readingProgress.value = data.progress;
    // Update progress in the store
    libraryStore.updateReadingProgress(currentBook.value.id, data.progress);
  }
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

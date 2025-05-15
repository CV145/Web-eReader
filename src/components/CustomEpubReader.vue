<template>
  <div
    class="epub-reader-container flex flex-col h-full w-full relative text-gray-800"
    :class="{ 'dark-mode': isDarkMode }"
  >
    <!-- Reader header with controls -->
    <header
      class="reader-header flex justify-between items-center p-2 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
    >
      <div class="flex items-center space-x-2">
        <router-link
          to="/library"
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <span class="text-lg">🔙</span> Back to Library
        </router-link>
        <h1 class="font-semibold text-gray-800 dark:text-gray-200">
          {{ bookMetadata.title }}
        </h1>
      </div>

      <div class="flex items-center space-x-4">
        <!-- Font size controls -->
        <div class="text-controls flex items-center space-x-2">
          <button
            @click="decreaseFontSize"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Decrease font size"
          >
            <span class="text-lg">A-</span>
          </button>
          <button
            @click="increaseFontSize"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title="Increase font size"
          >
            <span class="text-lg">A+</span>
          </button>
        </div>

        <!-- Theme toggle -->
        <button
          @click="toggleTheme"
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          title="Toggle light/dark mode"
        >
          <span v-if="isDarkMode" class="text-lg">☀️</span>
          <span v-else class="text-lg">🌙</span>
        </button>

        <!-- Chapter navigation buttons -->
        <div class="flex items-center space-x-2">
          <button
            @click="previousChapter"
            :disabled="currentChapterIndex === 0"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="Previous chapter"
          >
            <span class="text-lg">◀</span>
          </button>
          <div class="text-sm text-gray-600 dark:text-gray-300">
            {{ currentChapterIndex + 1 }}/{{ totalChapters }}
          </div>
          <button
            @click="nextChapter"
            :disabled="currentChapterIndex === totalChapters - 1"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
            title="Next chapter"
          >
            <span class="text-lg">▶</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Loading indicator -->
    <div
      v-if="isLoading"
      class="fixed inset-0 flex justify-center items-center bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-50"
    >
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-blue-500 border-gray-300 mb-2"></div>
        <p class="text-gray-700 dark:text-gray-300">Loading...</p>
      </div>
    </div>

    <!-- Error message -->
    <div
      v-if="errorMessage"
      class="fixed inset-0 flex justify-center items-center bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-50"
    >
      <div class="bg-red-50 dark:bg-red-900 p-6 rounded-lg shadow-lg max-w-md">
        <h3 class="text-red-700 dark:text-red-300 font-bold mb-2">Error</h3>
        <p class="text-gray-800 dark:text-gray-200">{{ errorMessage }}</p>
        <button
          @click="errorMessage = null"
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Dismiss
        </button>
      </div>
    </div>

    <!-- Main content area -->
    <main
      ref="scrollContainer"
      class="reader-content flex-grow overflow-y-auto bg-gray-100 dark:bg-gray-900 transition-colors duration-300"
      :style="{ fontSize: `${fontSize}px` }"
      @scroll="handleScroll"
    >
      <!-- Chapter content rendered here -->
      <div
        ref="contentEl"
        class="chapter-content-wrapper max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md dark:shadow-none min-h-full transition-colors duration-300"
        id="chapter-content-container"
      >
        <div v-if="currentChapterContent" v-html="currentChapterContent"></div>
        <div v-else class="p-8 text-center text-gray-600 dark:text-gray-400">
          No content to display
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { EpubParser } from "../utils/epubParser";
import { testEpubFile } from "../utils/epubValidator";
import { createDownloadLink } from "../utils/fileUtils";

// Props
const props = defineProps({
  bookUrl: {
    type: String,
    required: true,
  },
  bookId: {
    type: String,
    required: true,
  },
  bookTitle: {
    type: String,
    default: "",
  },
});

// Emits
const emit = defineEmits([
  "book-loaded",
  "book-load-error",
  "chapter-changed",
  "position-updated",
]);

// Refs for DOM elements
const contentEl = ref(null);
const scrollContainer = ref(null);

// State variables
const epubParser = ref(null);
const isLoading = ref(true);
const errorMessage = ref(null);
const currentChapterContent = ref("");
const currentChapterIndex = ref(0);
const bookMetadata = ref({
  title: "",
  creator: "",
  publisher: "",
});
const totalChapters = ref(0);
const fontSize = ref(18);
const isDarkMode = ref(false);
const showParagraphNumbers = ref(false);
const readingProgress = ref(0);
const epubLocation = ref(null);

// Keep track of whether we want to restore position
const shouldRestorePosition = ref(false);
const positionToRestore = ref(0);

// Debug mode
const DEBUG_MODE = true;

// Function to handle scroll events in the reader
const handleScroll = (event) => {
  if (!event.target) return;
  
  // Check if we should log debug info
  const shouldLog = !window.lastScrollLogTime || (Date.now() - window.lastScrollLogTime > 1000);
  if (shouldLog && DEBUG_MODE) {
    console.log('Scroll event detected on', event.target.tagName);
    window.lastScrollLogTime = Date.now();
  }
  
  // Get scroll position
  const scrollTop = event.target.scrollTop;
  if (typeof scrollTop === 'number' && scrollTop > 0) {
    // Update location data
    epubLocation.value = {
      chapterIndex: currentChapterIndex.value,
      scrollPosition: scrollTop
    };
    
    // Save reading position after a delay
    if (window.savePositionTimeout) {
      clearTimeout(window.savePositionTimeout);
    }
    window.savePositionTimeout = setTimeout(() => {
      saveReadingPosition();
    }, 300);
  }
};

// Function to save reading position
const saveReadingPosition = () => {
  if (!props.bookId) return;
  
  try {
    // Prepare position data
    const positionData = {
      chapterIndex: epubLocation.value.chapterIndex,
      scrollPosition: epubLocation.value.scrollPosition,
      savedAt: new Date().toISOString()
    };
    
    // Only save if position is significant (not at the top)
    if (positionData.scrollPosition > 10) {
      // Save to localStorage and sessionStorage for redundancy
      const dataString = JSON.stringify(positionData);
      localStorage.setItem(`book-progress-${props.bookId}`, dataString);
      sessionStorage.setItem(`book-progress-${props.bookId}`, dataString);
      
      // Also store in window for immediate access
      window.lastSavedPosition = positionData;
      
      if (DEBUG_MODE) {
        console.log(`📥 POSITION SAVED: Chapter ${positionData.chapterIndex + 1}, position ${Math.round(positionData.scrollPosition)}px`);
      }
      
      // Emit position update event
      emit("position-updated", positionData);
    }
  } catch (error) {
    console.error('Error saving reading position:', error);
  }
};

// Function to load the reading position
const loadReadingPosition = () => {
  if (!props.bookId) return false;
  
  try {
    if (DEBUG_MODE) {
      console.log(`🔍 Attempting to load position for book ID: ${props.bookId}`);
    }
    
    // Try multiple sources in order of reliability
    let savedData = null;
    
    // Try window object first (most immediate)
    if (window.lastSavedPosition) {
      savedData = window.lastSavedPosition;
    }
    
    // Next try sessionStorage
    if (!savedData) {
      const sessionData = sessionStorage.getItem(`book-progress-${props.bookId}`);
      if (sessionData) {
        try {
          savedData = JSON.parse(sessionData);
        } catch (e) {}
      }
    }
    
    // Finally try localStorage
    if (!savedData) {
      const localData = localStorage.getItem(`book-progress-${props.bookId}`);
      if (localData) {
        try {
          savedData = JSON.parse(localData);
        } catch (e) {}
      }
    }
    
    if (savedData && typeof savedData.chapterIndex === 'number') {
      // Ensure we have a valid scroll position or default to 0
      const scrollPosition = typeof savedData.scrollPosition === 'number' ? savedData.scrollPosition : 0;
      
      epubLocation.value = {
        chapterIndex: savedData.chapterIndex,
        scrollPosition: scrollPosition
      };
      
      if (DEBUG_MODE) {
        console.log(`📤 LOADED POSITION: Chapter ${savedData.chapterIndex + 1}, position ${Math.round(scrollPosition)}px`);
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error loading reading position:', error);
  }
  
  return false;
};

// Function to apply scroll position
const applyScrollPosition = (position) => {
  if (!position || position <= 0) return;
  
  // Find all possible scrollable containers
  const containers = [
    scrollContainer.value,
    contentEl.value,
    document.querySelector('.chapter-content-wrapper'),
    document.querySelector('.reader-content'),
    document.querySelector('main')
  ].filter(Boolean);
  
  // Apply position to all containers
  containers.forEach(container => {
    if (container && typeof container.scrollTop !== 'undefined') {
      try {
        container.scrollTop = position;
        if (DEBUG_MODE) {
          console.log(`Applied position ${Math.round(position)}px to ${container.tagName}`);
        }
      } catch (e) {}
    }
  });
};

// Function to set up scroll tracking
const setupScrollTracking = () => {
  if (window.scrollHandlerAttached) return;
  
  if (DEBUG_MODE) {
    console.log('🔥 Setting up global scroll tracking');
  }
  
  // Create a safe handler that won't throw errors
  const safeScrollHandler = (event) => {
    try {
      if (event && event.target) {
        handleGlobalScroll(event);
      }
    } catch (error) {
      console.error('Error in scroll handler:', error);
    }
  };
  
  // Add scroll listeners to multiple elements
  window.addEventListener('scroll', safeScrollHandler, { passive: true });
  document.addEventListener('scroll', safeScrollHandler, { passive: true });
  
  // Also add wheel event listener as a backup
  window.addEventListener('wheel', () => {
    setTimeout(() => saveReadingPosition(), 100);
  }, { passive: true });
  
  // Find and track all scrollable elements
  const scrollableSelectors = [
    '.chapter-content-wrapper',
    '.reader-content',
    '#chapter-content-container',
    'main'
  ];
  
  // Add listeners to each scrollable element
  scrollableSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach(el => {
        try {
          el.addEventListener('scroll', safeScrollHandler, { passive: true });
          if (DEBUG_MODE) {
            console.log(`Added scroll listener to ${el.tagName}.${el.className}`);
          }
        } catch (e) {}
      });
    }
  });
  
  // Mark as attached
  window.scrollHandlerAttached = true;
};

// Global scroll handler
const handleGlobalScroll = (event) => {
  if (!event || !event.target) return;
  
  // Find the scrollable parent
  let scrollElement = event.target;
  let scrollPosition = 0;
  
  try {
    // Get scroll position directly
    if (typeof scrollElement.scrollTop === 'number') {
      scrollPosition = scrollElement.scrollTop;
    }
    
    // Only process significant scroll positions
    if (scrollPosition > 10) {
      // Update location data
      epubLocation.value = {
        chapterIndex: currentChapterIndex.value,
        scrollPosition: scrollPosition
      };
      
      // Debounce the save operation
      if (window.globalScrollSaveTimeout) {
        clearTimeout(window.globalScrollSaveTimeout);
      }
      
      window.globalScrollSaveTimeout = setTimeout(() => {
        saveReadingPosition();
      }, 300);
    }
  } catch (e) {
    console.error('Error in global scroll handler:', e);
  }
};

// Initialize EPUB parser and load book
const loadBook = async () => {
  try {
    console.log("Starting to load book from:", props.bookUrl.substring(0, 50) + "...");
    isLoading.value = true;
    errorMessage.value = null;

    // Check if book URL is valid
    if (!props.bookUrl) {
      throw new Error("No book URL provided");
    }

    // Create a new parser instance
    epubParser.value = new EpubParser();
    
    // Try to load the book
    try {
      // Handle different URL types
      if (props.bookUrl.startsWith("data:") || props.bookUrl.startsWith("blob:")) {
        const response = await fetch(props.bookUrl);
        const arrayBuffer = await response.arrayBuffer();
        await epubParser.value.loadFile(arrayBuffer);
      } else {
        const response = await fetch(props.bookUrl);
        const arrayBuffer = await response.arrayBuffer();
        await epubParser.value.loadFile(arrayBuffer);
      }
    } catch (fetchError) {
      console.error("Error processing book data:", fetchError);
      throw new Error(`Failed to process book data: ${fetchError.message}`);
    }

    // Set book metadata
    bookMetadata.value = {
      title: epubParser.value.metadata.title || props.bookTitle,
      creator: epubParser.value.metadata.creator || "Unknown",
      publisher: epubParser.value.metadata.publisher || "",
    };

    totalChapters.value = epubParser.value.spine.length;

    // Load saved reading position from localStorage
    loadReadingPosition();
    
    // Restore reading position or start from beginning
    if (epubLocation.value && typeof epubLocation.value.chapterIndex === "number") {
      currentChapterIndex.value = epubLocation.value.chapterIndex;
    } else {
      currentChapterIndex.value = 0;
    }

    // Load current chapter
    await loadChapter(currentChapterIndex.value);

    // Book is successfully loaded
    emit("book-loaded", {
      title: bookMetadata.value.title,
      creator: bookMetadata.value.creator,
      totalChapters: totalChapters.value,
      savedPosition: epubLocation.value
    });
    
    // Add scroll tracking after the book is loaded
    nextTick(() => {
      setupScrollTracking();
    });

    isLoading.value = false;
  } catch (error) {
    console.error("Error loading book:", error);
    errorMessage.value = error.message || "Failed to load book";
    isLoading.value = false;
    emit("book-load-error", {
      bookId: props.bookId,
      error: errorMessage.value,
    });
  }
};

// Load specific chapter
const loadChapter = async (index) => {
  try {
    isLoading.value = true;
    
    if (DEBUG_MODE) {
      console.log(`📖 LOADING CHAPTER ${index + 1}`);
    }

    // Go to specified chapter and get content with options
    const chapter = await epubParser.value.goToChapter(index, {
      numberParagraphs: showParagraphNumbers.value,
    });
    
    // Check if we should restore position
    const isSameChapter = epubLocation.value && epubLocation.value.chapterIndex === index;
    shouldRestorePosition.value = isSameChapter;
    
    if (isSameChapter) {
      positionToRestore.value = epubLocation.value.scrollPosition || 0;
      if (DEBUG_MODE) {
        console.log(`📌 Will restore position to ${Math.round(positionToRestore.value)}px after content load`);
      }
    } else {
      positionToRestore.value = 0;
    }
    
    // Update chapter content
    currentChapterContent.value = chapter.content;
    currentChapterIndex.value = chapter.index;

    // Update page info
    updatePageInfo();

    // Save current position
    epubLocation.value = {
      chapterIndex: currentChapterIndex.value,
      scrollPosition: positionToRestore.value,
    };

    isLoading.value = false;

    // After rendering, handle image processing and position restoration
    nextTick(async () => {
      // Process images in the chapter
      await processImages();
      
      // Restore scroll position if needed
      if (shouldRestorePosition.value && positionToRestore.value > 10) {
        if (DEBUG_MODE) {
          console.log(`🔥 Restoring position to ${Math.round(positionToRestore.value)}px`);
        }
        
        // First immediate application
        applyScrollPosition(positionToRestore.value);
        
        // Then set up a persistent interval to ensure it sticks
        if (window.positionRestorationInterval) {
          clearInterval(window.positionRestorationInterval);
        }
        
        // Set up an interval to ensure position is maintained
        window.positionRestorationInterval = setInterval(() => {
          // Only reapply if current position is near top
          if (scrollContainer.value && scrollContainer.value.scrollTop < 10 && positionToRestore.value > 10) {
            applyScrollPosition(positionToRestore.value);
          }
        }, 200);
        
        // Clear the interval after 5 seconds
        setTimeout(() => {
          if (window.positionRestorationInterval) {
            clearInterval(window.positionRestorationInterval);
            window.positionRestorationInterval = null;
          }
        }, 5000);
      }
      
      // Update progress
      updateProgress();
    });
  } catch (error) {
    console.error("Error loading chapter:", error);
    errorMessage.value = `Failed to load chapter: ${error.message}`;
    isLoading.value = false;
  }
};

// Process images in the EPUB content
const processImages = async () => {
  if (!contentEl.value) return;
  
  // Get all images in the content
  const images = contentEl.value.querySelectorAll("img");
  if (images.length === 0) return;
  
  // Process each image
  for (const img of images) {
    try {
      // Check if image has a valid source
      const src = img.getAttribute("src");
      if (!src) continue;
      
      // Add loading attribute and styles
      img.setAttribute("loading", "lazy");
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      
      // Add missing alt text if needed
      if (!img.hasAttribute("alt")) {
        img.setAttribute("alt", "Book illustration");
      }
    } catch (e) {
      console.error("Error processing image:", e);
    }
  }
};

// Navigation methods
const nextChapter = () => {
  if (currentChapterIndex.value < totalChapters.value - 1) {
    loadChapter(currentChapterIndex.value + 1);
  }
};

const previousChapter = () => {
  if (currentChapterIndex.value > 0) {
    loadChapter(currentChapterIndex.value - 1);
  }
};

// Font size controls
const increaseFontSize = () => {
  fontSize.value = Math.min(fontSize.value + 2, 32);
};

const decreaseFontSize = () => {
  fontSize.value = Math.max(fontSize.value - 2, 12);
};

// Toggle theme (dark/light mode)
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
};

// Update page info
const updatePageInfo = () => {
  // Update the reading progress
  readingProgress.value = Math.round((currentChapterIndex.value / (totalChapters.value - 1)) * 100);
};

// Update progress
const updateProgress = () => {
  // Update overall progress percentage
  const progress = (currentChapterIndex.value / (totalChapters.value - 1)) * 100;
  readingProgress.value = Math.round(progress);
  
  // Store current progress data
  try {
    localStorage.setItem(`book-progress-percentage-${props.bookId}`, String(readingProgress.value));
  } catch (e) {
    console.error('Error saving progress percentage:', e);
  }
};

// Watch for changes to load the book
watch(() => props.bookUrl, (newUrl) => {
  if (newUrl) {
    loadBook();
  }
}, { immediate: true });

// Lifecycle hooks
onMounted(() => {
  // Load book when component is mounted
  if (props.bookUrl) {
    loadBook();
  }
  
  // Clean up any existing intervals
  if (window.positionRestorationInterval) {
    clearInterval(window.positionRestorationInterval);
  }
  
  // Clean up any existing timeouts
  if (window.savePositionTimeout) {
    clearTimeout(window.savePositionTimeout);
  }
});

onUnmounted(() => {
  // Clean up event listeners and intervals
  if (window.positionRestorationInterval) {
    clearInterval(window.positionRestorationInterval);
  }
  
  if (window.savePositionTimeout) {
    clearTimeout(window.savePositionTimeout);
  }
  
  // Remove scroll listeners
  window.removeEventListener('scroll', handleGlobalScroll);
  document.removeEventListener('scroll', handleGlobalScroll);
});
</script>

<style scoped>
.epub-reader-container {
  height: 100vh;
  overflow: hidden;
}

.reader-content {
  scroll-behavior: smooth;
}

.chapter-content-wrapper {
  min-height: 95vh;
  line-height: 1.6;
}

/* Dark mode styles */
.dark-mode {
  @apply text-gray-200;
}

.dark-mode .chapter-content-wrapper {
  @apply bg-gray-800 text-gray-200;
}

/* Add responsive adjustments */
@media (max-width: 640px) {
  .chapter-content-wrapper {
    padding: 1rem;
  }
}

/* Custom scrollbar */
.reader-content::-webkit-scrollbar {
  width: 8px;
}

.reader-content::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.reader-content::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.dark-mode .reader-content::-webkit-scrollbar-track {
  background: #2d3748;
}

.dark-mode .reader-content::-webkit-scrollbar-thumb {
  background: #4a5568;
}
</style>

<template>
  <div
    class="epub-reader-container flex flex-col h-full w-full relative text-gray-800"
    :class="{ 'dark-mode': isDarkMode }"
  >
    <!-- Reader header with controls -->
    <ReaderHeader
      :title="bookMetadata.title"
      :is-dark-mode="isDarkMode"
      :current-chapter-index="currentChapterIndex"
      :total-chapters="totalChapters"
      @increase-font="increaseFontSize"
      @decrease-font="decreaseFontSize"
      @toggle-theme="toggleTheme"
      @previous-chapter="previousChapter"
      @next-chapter="nextChapter"
    />

    <!-- Loading indicator -->
    <LoadingIndicator :is-visible="isLoading" />

    <!-- Error message -->
    <ErrorDisplay
      :error-message="errorMessage"
      @dismiss="errorMessage = null"
    />

    <!-- Main content area -->
    <ReaderContent
      ref="readerContent"
      :chapter-content="currentChapterContent"
      :font-size="fontSize"
      :scroll-position="scrollPosition"
      @scroll="handleScroll"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useEpubParser } from "../../composables/useEpubParser";
import { useReadingPosition } from "../../composables/useReadingPosition";
import { useBookmarks } from "../../composables/useBookmarks";
import { useTheme } from "../../composables/useTheme";
import { useScrollTracking } from "../../composables/useScrollTracking";
import ReaderHeader from "./ReaderHeader.vue";
import ReaderContent from "./ReaderContent.vue";
import LoadingIndicator from "./LoadingIndicator.vue";
import ErrorDisplay from "./ErrorDisplay.vue";

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
  "bookmark-added",
  "chapter-changed",
  "position-updated",
]);

// Debug mode
const DEBUG_MODE = true;

// Initialize composables
const {
  currentChapterContent,
  currentChapterIndex,
  totalChapters,
  bookMetadata,
  tableOfContents,
  isLoading,
  errorMessage,
  loadBook,
  loadChapter,
  processImages,
  nextChapter: goToNextChapter,
  previousChapter: goToPreviousChapter,
} = useEpubParser(DEBUG_MODE);

const { isDarkMode, toggleTheme } = useTheme();

const {
  epubLocation,
  readingProgress,
  saveReadingPosition,
  loadReadingPosition,
  updateProgress,
} = useReadingPosition(props.bookId, DEBUG_MODE);

const { bookmarks, loadBookmarks, saveBookmarks, addBookmark } = useBookmarks(props.bookId);

const { applyScrollPosition, setupScrollTracking, handleScroll: scrollHandler } = useScrollTracking(
  saveReadingPosition,
  DEBUG_MODE
);

// Refs for DOM elements
const readerContent = ref(null);

// State variables
const fontSize = ref(18);
const showParagraphNumbers = ref(false);
const shouldRestorePosition = ref(false);
const positionToRestore = ref(0);
const scrollPosition = computed(() => epubLocation.value?.scrollPosition || 0);

// Font size controls
const increaseFontSize = () => {
  fontSize.value = Math.min(fontSize.value + 2, 32);
};

const decreaseFontSize = () => {
  fontSize.value = Math.max(fontSize.value - 2, 12);
};

// Navigation methods
const nextChapter = async () => {
  try {
    await goToNextChapter();
    emit("chapter-changed", currentChapterIndex.value);
    updateProgress(currentChapterIndex.value, totalChapters.value);
  } catch (error) {
    console.error("Error navigating to next chapter:", error);
  }
};

const previousChapter = async () => {
  try {
    await goToPreviousChapter();
    emit("chapter-changed", currentChapterIndex.value);
    updateProgress(currentChapterIndex.value, totalChapters.value);
  } catch (error) {
    console.error("Error navigating to previous chapter:", error);
  }
};

// Function to handle scroll events in the reader
const handleScroll = (event) => {
  if (readerContent.value) {
    scrollHandler(
      event,
      epubLocation,
      currentChapterIndex
    );
  }
};

// Initialize EPUB parser and load book
const initializeBook = async () => {
  try {
    // Load the EPUB
    const bookLoaded = await loadBook(props.bookUrl, props.bookTitle);
    if (!bookLoaded) return;
    
    // Load bookmarks
    loadBookmarks();

    // Load saved reading position from localStorage
    loadReadingPosition();
    
    // Restore reading position or start from beginning
    if (epubLocation.value && typeof epubLocation.value.chapterIndex === "number") {
      currentChapterIndex.value = epubLocation.value.chapterIndex;
    } else {
      currentChapterIndex.value = 0;
    }

    // Load current chapter
    await loadChapter(currentChapterIndex.value, showParagraphNumbers.value);
    
    // Check if we should restore position
    const isSameChapter = epubLocation.value && epubLocation.value.chapterIndex === currentChapterIndex.value;
    shouldRestorePosition.value = isSameChapter;
    
    if (isSameChapter) {
      positionToRestore.value = epubLocation.value.scrollPosition || 0;
      if (DEBUG_MODE) {
        console.log(`📌 Will restore position to ${Math.round(positionToRestore.value)}px after content load`);
      }
    } else {
      positionToRestore.value = 0;
    }

    // Update progress
    updateProgress(currentChapterIndex.value, totalChapters.value);

    // Book is successfully loaded
    emit("book-loaded", {
      title: bookMetadata.value.title,
      creator: bookMetadata.value.creator,
      totalChapters: totalChapters.value,
      savedPosition: epubLocation.value,
      toc: tableOfContents.value,
      bookmarks: bookmarks.value
    });
    
    // Add scroll tracking after the book is loaded
    nextTick(async () => {
      // Process images in the chapter
      if (readerContent.value) {
        await processImages(readerContent.value.contentEl);
      }
      
      // Restore scroll position if needed
      if (shouldRestorePosition.value && positionToRestore.value > 10 && readerContent.value) {
        if (DEBUG_MODE) {
          console.log(`🔥 Restoring position to ${Math.round(positionToRestore.value)}px`);
        }
        
        // Apply scroll position
        applyScrollPosition(
          positionToRestore.value, 
          readerContent.value.scrollContainer, 
          readerContent.value.contentEl
        );
      }
      
      // Setup scroll tracking
      setupScrollTracking(epubLocation, currentChapterIndex);
    });
  } catch (error) {
    console.error("Error initializing book:", error);
    errorMessage.value = error.message || "Failed to initialize book";
    emit("book-load-error", {
      bookId: props.bookId,
      error: errorMessage.value,
    });
  }
};

// Create a bookmark
const createBookmark = () => {
  if (readerContent.value) {
    const bookmark = addBookmark(
      readerContent.value.contentEl,
      readerContent.value.scrollContainer,
      currentChapterIndex.value,
      epubLocation.value,
      bookMetadata.value
    );
    emit("bookmark-added", bookmark);
    return bookmark;
  }
  return null;
};

// Watch for changes to load the book
watch(() => props.bookUrl, (newUrl) => {
  if (newUrl) {
    initializeBook();
  }
}, { immediate: true });

// Lifecycle hooks
onMounted(() => {
  // Load book when component is mounted
  if (props.bookUrl) {
    initializeBook();
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
  
  // Clean up scroll tracking
  window.scrollHandlerAttached = false;
});

// Expose methods to parent
defineExpose({
  createBookmark
});
</script>

<style scoped>
.epub-reader-container {
  height: 100vh;
  overflow: hidden;
}

/* Dark mode styles */
.dark-mode {
  @apply text-gray-200;
}
</style>

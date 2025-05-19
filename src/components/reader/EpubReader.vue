<template>
  <div
    class="epub-reader-container flex flex-col h-full w-full relative"
    :class="{ 'dark-theme': isDarkMode }"
  >
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
      :show-paragraph-numbers="showParagraphNumbers"
      @scroll="handleScroll"
      @create-bookmark="handleCreateBookmark"
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

const {
  bookmarks,
  loadBookmarks,
  saveBookmarks,
  addBookmark,
  getBookmarks,
  removeBookmark,
  navigateToBookmark,
} = useBookmarks(props.bookId);

const {
  applyScrollPosition,
  setupScrollTracking,
  handleScroll: scrollHandler,
} = useScrollTracking(saveReadingPosition, DEBUG_MODE);

// Refs for DOM elements
const readerContent = ref(null);

// State variables
const fontSize = ref(18);
const showParagraphNumbers = ref(false);
const shouldRestorePosition = ref(true);
const positionToRestore = ref(0);
const scrollPosition = ref(0);

// Update exposed scroll position whenever epubLocation changes
watch(
  () => epubLocation.value?.scrollPosition,
  (newPos) => {
    if (typeof newPos === "number" && newPos > 0) {
      scrollPosition.value = newPos;
      console.log(`📜 Updating shared scroll position to ${newPos}px`);
    }
  }
);

// Font size controls
const increaseFontSize = () => {
  fontSize.value = Math.min(fontSize.value + 2, 32);
};

const decreaseFontSize = () => {
  fontSize.value = Math.max(fontSize.value - 2, 12);
};

// Toggle paragraph numbering
const toggleParagraphNumbering = (value = undefined) => {
  // If a specific value is provided, use it; otherwise toggle
  if (value !== undefined) {
    showParagraphNumbers.value = value;
  } else {
    showParagraphNumbers.value = !showParagraphNumbers.value;
  }

  console.log(
    `Paragraph numbering ${showParagraphNumbers.value ? "enabled" : "disabled"}`
  );

  // Reload the current chapter with the new paragraph numbering setting
  loadCurrentChapterWithParagraphNumbers();
};

// Helper function to reload the current chapter with paragraph numbers
const loadCurrentChapterWithParagraphNumbers = async () => {
  try {
    console.log(
      `Reloading chapter with paragraph numbering: ${showParagraphNumbers.value}`
    );
    if (typeof currentChapterIndex.value === "number") {
      await loadChapter(currentChapterIndex.value, showParagraphNumbers.value);
    }
  } catch (error) {
    console.error("Error reloading chapter with paragraph numbers:", error);
  }
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
    scrollHandler(event, epubLocation, currentChapterIndex);
  }
};

// Create a bookmark from a paragraph element
const handleCreateBookmark = (paragraphElement) => {
  if (readerContent.value) {
    try {
      const bookmark = addBookmark(
        readerContent.value.contentEl,
        readerContent.value.scrollContainer,
        currentChapterIndex.value,
        epubLocation.value,
        bookMetadata.value,
        paragraphElement // Pass the specific paragraph element
      );

      emit("bookmark-added", bookmark);
      return bookmark;
    } catch (error) {
      console.error("Error creating bookmark:", error);
      return null;
    }
  }
  return null;
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
    const positionLoaded = loadReadingPosition();

    if (DEBUG_MODE) {
      console.log("Position loaded result:", positionLoaded);
      console.log("Current epubLocation:", epubLocation.value);
    }

    // Restore reading position or start from beginning
    if (
      epubLocation.value &&
      typeof epubLocation.value.chapterIndex === "number"
    ) {
      currentChapterIndex.value = epubLocation.value.chapterIndex;
      // Store the scroll position to restore later
      positionToRestore.value = epubLocation.value.scrollPosition || 0;

      // Update the exposed scroll position for the ReaderContent component
      scrollPosition.value = positionToRestore.value;

      if (DEBUG_MODE) {
        console.log(
          `Will restore to chapter ${
            currentChapterIndex.value + 1
          } at position ${Math.round(positionToRestore.value)}px`
        );
      }
    } else {
      currentChapterIndex.value = 0;
      positionToRestore.value = 0;
      scrollPosition.value = 0;
    }

    // Remember the position to restore
    const positionToRestoreAfterLoad = positionToRestore.value;

    // Load current chapter
    await loadChapter(currentChapterIndex.value, showParagraphNumbers.value);

    // Make sure position value wasn't lost during chapter load
    positionToRestore.value = positionToRestoreAfterLoad;

    // Update scrollPosition right after chapter load
    if (positionToRestore.value > 0) {
      scrollPosition.value = positionToRestore.value;
      console.log(
        `Force-updating scroll position to ${positionToRestore.value}px after chapter load`
      );
    }

    // Check if we should restore position
    const isSameChapter =
      epubLocation.value &&
      epubLocation.value.chapterIndex === currentChapterIndex.value;
    shouldRestorePosition.value = isSameChapter;

    if (isSameChapter) {
      positionToRestore.value = epubLocation.value.scrollPosition || 0;
      if (DEBUG_MODE) {
        console.log(
          `📌 Will restore position to ${Math.round(
            positionToRestore.value
          )}px after content load`
        );
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
      bookmarks: bookmarks.value,
    });

    // After rendering, handle image processing and position restoration
    nextTick(async () => {
      // Process images in the chapter
      if (readerContent.value) {
        await processImages(readerContent.value.contentEl);
      }

      // Update scroll position once after content is loaded
      if (positionToRestore.value > 10 && shouldRestorePosition.value) {
        if (DEBUG_MODE) {
          console.log(
            `Setting scroll position to ${Math.round(
              positionToRestore.value
            )}px after content load`
          );
        }

        // Update the reactive reference that the Reader content will watch
        scrollPosition.value = positionToRestore.value;

        // Direct application only once with a brief delay
        setTimeout(() => {
          if (readerContent.value && readerContent.value.scrollContainer) {
            readerContent.value.scrollContainer.scrollTop =
              positionToRestore.value;
          }
        }, 300);
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
watch(
  () => props.bookUrl,
  (newUrl) => {
    if (newUrl) {
      initializeBook();
    }
  },
  { immediate: true }
);

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

// Expose methods for the parent component to use
defineExpose({
  nextChapter,
  previousChapter,
  increaseFontSize,
  decreaseFontSize,
  toggleTheme,
  toggleParagraphNumbering,
  createBookmark,
  navigateToBookmark,
  getBookmarks,
  removeBookmark,
});
</script>

<style scoped>
.epub-reader-container {
  height: 100vh;
  overflow: hidden;
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>

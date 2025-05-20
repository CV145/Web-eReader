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
// Import the settings store
import { useSettingsStore } from "../../stores/settingsStore";

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
} = useBookmarks(props.bookId);

const {
  applyScrollPosition,
  setupScrollTracking,
  handleScroll: scrollHandler,
} = useScrollTracking(saveReadingPosition, DEBUG_MODE);

const settingsStore = useSettingsStore();

// Refs for DOM elements
const readerContent = ref(null);

// State variables
// Replace the local fontSize ref with a computed property
const fontSize = computed(() => settingsStore.fontSize);

// Use computed property for showParagraphNumbers
// This ensures it stays in sync with the store value and persists across page refreshes
const showParagraphNumbers = computed(() => settingsStore.paragraphNumbering);

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
// Update the font size methods to use the store
const increaseFontSize = () => {
  settingsStore.increaseFontSize();
};

const decreaseFontSize = () => {
  settingsStore.decreaseFontSize();
};

// Toggle paragraph numbering
const toggleParagraphNumbering = (value = undefined) => {
  // Get the current value from the store
  const currentValue = settingsStore.paragraphNumbering;

  // Determine the new value
  const newValue = value !== undefined ? value : !currentValue;

  console.log("Toggling paragraph numbering:", {
    receivedValue: value,
    currentValue,
    newValue,
  });

  // Only update if different to prevent unnecessary updates
  if (newValue !== currentValue) {
    settingsStore.paragraphNumbering = newValue;
  }

  // Always reload to ensure the UI reflects the current state
  loadCurrentChapterWithParagraphNumbers();
};

// Helper function to reload the current chapter with paragraph numbers
const loadCurrentChapterWithParagraphNumbers = async () => {
  try {
    console.log(
      "Current store value in loadCurrentChapterWithParagraphNumbers:",
      settingsStore.paragraphNumbering
    );

    if (typeof currentChapterIndex.value === "number") {
      await loadChapter(
        currentChapterIndex.value,
        settingsStore.paragraphNumbering
      );
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

    // Load current chapter with paragraph numbering from settings store
    // This ensures the user's preference for paragraph numbering is applied consistently
    await loadChapter(
      currentChapterIndex.value,
      settingsStore.paragraphNumbering
    );

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

// Navigate to a bookmark
const navigateToBookmark = async (bookmark) => {
  try {
    console.log("Navigating to bookmark:", bookmark);

    // First, navigate to the correct chapter if needed
    if (bookmark.chapterIndex !== currentChapterIndex.value) {
      // Load the bookmark's chapter first
      await loadChapter(bookmark.chapterIndex, showParagraphNumbers.value);
      emit("chapter-changed", bookmark.chapterIndex);
    }

    // Wait for the next tick to ensure the chapter content is rendered
    await nextTick();

    // Find the paragraph by index
    if (
      typeof bookmark.paragraphIndex === "number" &&
      bookmark.paragraphIndex >= 0
    ) {
      const paragraphs = readerContent.value?.$el.querySelectorAll("p");

      if (paragraphs && paragraphs.length > 0) {
        // Get the target paragraph
        const targetIndex = Math.min(
          bookmark.paragraphIndex,
          paragraphs.length - 1
        );
        const targetParagraph = paragraphs[targetIndex];

        console.log("Navigating to paragraph:", targetParagraph);

        if (targetParagraph) {
          // Get the main scrollable element directly from the DOM
          // The ReaderContent component has a main element with class "reader-content"
          const scrollContainer = readerContent.value?.$el;

          // Log the scroll container element for debugging
          console.log("Scroll container:", scrollContainer);

          if (scrollContainer) {
            // Calculate the position to scroll to
            // We need to get the target paragraph's position relative to its parent
            const scrollPosition = targetParagraph.offsetTop;

            // Set the scrollTop property of the container
            // This directly controls the vertical scroll position
            scrollContainer.scrollTop = scrollPosition;

            // Log for debugging
            console.log("Scrolling container to position:", scrollPosition);
          } else {
            // Fallback to default behavior if container not found
            console.warn(
              "Scroll container not found, falling back to scrollIntoView"
            );
            targetParagraph.scrollIntoView({
              behavior: "smooth", // Smooth scrolling animation
              block: "start", // Align to the top of the viewport
            });
          }

          // Highlight the paragraph briefly
          targetParagraph.style.backgroundColor = "#ffff9980"; // Light yellow
          setTimeout(() => {
            targetParagraph.style.backgroundColor = "";
          }, 2000);

          // Update reading position
          const scrollPosition = targetParagraph.offsetTop;
          saveReadingPosition(currentChapterIndex.value, scrollPosition);
          return true;
        }
      }
    }

    // Fall back to the saved position if paragraph not found
    if (typeof bookmark.position === "number" && bookmark.position > 0) {
      applyScrollPosition(bookmark.position);
      saveReadingPosition(currentChapterIndex.value, bookmark.position);
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error navigating to bookmark:", error);
    return false;
  }
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

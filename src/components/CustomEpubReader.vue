<template>
  <EpubReader
    ref="epubReader"
    :book-url="bookUrl"
    :book-id="bookId"
    :book-title="bookTitle"
    @book-loaded="handleBookLoaded"
    @book-load-error="handleBookLoadError"
    @bookmark-added="handleBookmarkAdded"
    @chapter-changed="handleChapterChanged"
    @position-updated="handlePositionUpdated"
  />
</template>

<script setup>
import { ref } from "vue";
import EpubReader from "./reader/EpubReader.vue";

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

// Reference to the underlying EpubReader component
const epubReader = ref(null);

// Store table of contents data
const tableOfContents = ref([]);

// Event handlers that proxy to the underlying EpubReader component
const handleBookLoaded = (metadata) => {
  // Store the table of contents from the metadata
  if (metadata && metadata.toc) {
    tableOfContents.value = metadata.toc;
    console.log(
      "TOC received in CustomEpubReader:",
      metadata.toc.length,
      "items"
    );
  }
  emit("book-loaded", metadata);
};

const handleBookLoadError = (error) => {
  emit("book-load-error", error);
};

const handleBookmarkAdded = (bookmark) => {
  emit("bookmark-added", bookmark);
};

const handleChapterChanged = (chapterIndex) => {
  emit("chapter-changed", chapterIndex);
};

const handlePositionUpdated = (positionData) => {
  emit("position-updated", positionData);
};

// Public methods for compatibility with the old interface
const addBookmark = (paragraph = null) => {
  return epubReader.value?.createBookmark(paragraph);
};

// Get all bookmarks for the current book
const getBookmarks = () => {
  return epubReader.value?.getBookmarks() || [];
};

// Remove a bookmark by ID
const removeBookmark = (bookmarkId) => {
  return epubReader.value?.removeBookmark(bookmarkId) || false;
};

// Navigate to a specific bookmark
const navigateToBookmark = (bookmark) => {
  return epubReader.value?.navigateToBookmark(bookmark);
};

// Navigation methods
const nextChapter = () => {
  epubReader.value?.nextChapter();
};

const previousChapter = () => {
  epubReader.value?.previousChapter();
};

// Font size controls
const increaseFontSize = () => {
  epubReader.value?.increaseFontSize();
};

const decreaseFontSize = () => {
  epubReader.value?.decreaseFontSize();
};

// Toggle paragraph numbering
const toggleParagraphNumbering = (value) => {
  epubReader.value?.toggleParagraphNumbering(value);
};

// Theme toggle
const toggleTheme = () => {
  epubReader.value?.toggleTheme();
};

// Expose methods to parent components
defineExpose({
  addBookmark,
  getBookmarks,
  removeBookmark,
  navigateToBookmark,
  getTableOfContents: () => tableOfContents.value || [],
  nextChapter,
  previousChapter,
  increaseFontSize,
  decreaseFontSize,
  toggleParagraphNumbering,
  toggleTheme,
});
</script>

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

        <!-- Paragraph numbering toggle -->
        <button
          @click="toggleParagraphNumbering"
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          :class="{ 'bg-blue-100 dark:bg-blue-900': showParagraphNumbers }"
          title="Toggle paragraph numbering"
        >
          <span class="text-lg">¶</span>
        </button>

        <!-- Chapter navigation -->
        <div class="navigation-controls flex items-center space-x-2">
          <button
            @click="prevChapter"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            :disabled="currentChapterIndex <= 0"
            title="Previous chapter"
          >
            <span class="text-lg">◀️</span>
          </button>
          <button
            @click="nextChapter"
            class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            :disabled="currentChapterIndex >= totalChapters - 1"
            title="Next chapter"
          >
            <span class="text-lg">▶️</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Reader Content Area -->
    <main
      class="reader-content flex-grow relative bg-gray-50 dark:bg-gray-900 overflow-auto"
    >
      <!-- Loading spinner -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75"
      >
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"
        ></div>
      </div>

      <!-- Error message -->
      <div
        v-else-if="errorMessage"
        class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-red-50 dark:bg-red-900 dark:bg-opacity-80"
      >
        <p class="text-red-600 dark:text-red-300 font-semibold mb-2">
          Error loading book:
        </p>
        <p class="text-red-500 dark:text-red-400 text-sm mb-4">
          {{ errorMessage }}
        </p>
        <button
          @click="loadBook"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          Retry
        </button>
      </div>

      <!-- Book content -->
      <div
        v-else-if="chapterContent"
        class="chapter-content px-4 py-3 max-w-3xl mx-auto"
        :style="contentStyle"
      >
        <!-- Use v-html with sanitized content -->
        <div v-html="chapterContent" ref="contentEl"></div>
      </div>

      <!-- Page info display -->
      <div
        v-if="!isLoading && !errorMessage && chapterContent"
        class="page-info absolute bottom-2 right-2 p-2 bg-black bg-opacity-50 text-white text-xs rounded"
      >
        Chapter {{ currentChapterIndex + 1 }}/{{ totalChapters }} |
        {{ pageInfo }}
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useStorage } from "@vueuse/core";
import EpubParser from "../utils/epubParser";
import { testEpubFile, createDownloadLink } from "../utils/epubTest";

// Props
const props = defineProps({
  bookId: {
    type: String,
    default: "alice",
  },
  bookTitle: {
    type: String,
    default: "Alice's Adventures in Wonderland",
  },
  bookUrl: {
    type: String,
    required: true,
  },
  theme: {
    type: String,
    default: "light",
  },
  fontSize: {
    type: Number,
    default: 16,
  },
});

// Emits
const emit = defineEmits([
  "progress-update",
  "book-loaded",
  "book-load-error",
  "font-size-change",
  "theme-toggle",
]);

// State
const epubParser = ref(null);
const isLoading = ref(true);
const errorMessage = ref(null);
const chapterContent = ref("");
const currentChapterIndex = ref(0);
const totalChapters = ref(0);
const pageInfo = ref("");
const contentEl = ref(null);
const showParagraphNumbers = ref(false);
const bookMetadata = ref({
  title: props.bookTitle,
  creator: "",
  publisher: "",
});

// Computed
const isDarkMode = computed(() => props.theme === "dark");
const contentStyle = computed(() => ({
  "font-size": `${props.fontSize}px`,
  "line-height": "1.5",
  color: isDarkMode.value ? "#e0e0e0" : "#333",
  "background-color": isDarkMode.value ? "#1a1a1a" : "#fff",
  padding: "1rem",
  "min-height": "100%",
}));

// Store and retrieve reading position
const epubLocation = useStorage(`book-progress-${props.bookId}`, {
  chapterIndex: 0,
  scrollPosition: 0,
});

// No longer importing the EPUB file URL statically from Vite
// We're now using the bookUrl prop passed from the parent component

// Initialize EPUB parser and load book
const loadBook = async () => {
  try {
    console.log(
      "CustomEpubReader: Starting to load book from:",
      props.bookUrl.substring(0, 50) + "..."
    );
    isLoading.value = true;
    errorMessage.value = null;

    // Check if book URL is valid
    if (!props.bookUrl) {
      throw new Error("No book URL provided");
    }

    // For built-in books (relative paths), ensure proper path format
    let bookUrl = props.bookUrl;

    // Skip validation for already processed URLs (blob or data URLs)
    let skipValidation =
      bookUrl.startsWith("blob:") || bookUrl.startsWith("data:");

    if (!skipValidation) {
      // First, test if the EPUB file is valid
      console.log("CustomEpubReader: Testing EPUB file validity...");
      const testResult = await testEpubFile(bookUrl);
      console.log("CustomEpubReader: EPUB test result:", testResult);

      if (!testResult.success) {
        console.error(
          "CustomEpubReader: EPUB file validation failed:",
          testResult.error
        );

        // Create a download link for debugging
        const downloadContainer = document.createElement("div");
        downloadContainer.style.padding = "20px";
        downloadContainer.style.backgroundColor = "#f8f9fa";
        downloadContainer.style.border = "1px solid #ddd";
        downloadContainer.style.borderRadius = "5px";
        downloadContainer.style.margin = "20px auto";
        downloadContainer.style.maxWidth = "600px";

        const heading = document.createElement("h3");
        heading.textContent = "EPUB File Issue";
        heading.style.marginBottom = "10px";

        const message = document.createElement("p");
        message.textContent = `There appears to be an issue with the EPUB file: ${testResult.error}`;
        message.style.marginBottom = "15px";

        const instructions = document.createElement("p");
        instructions.textContent =
          "You can download the file to examine it or try a different EPUB file:";
        instructions.style.marginBottom = "15px";

        const downloadLink = createDownloadLink(
          props.bookUrl,
          `${props.bookId}.epub`
        );

        downloadContainer.appendChild(heading);
        downloadContainer.appendChild(message);
        downloadContainer.appendChild(instructions);
        downloadContainer.appendChild(downloadLink);

        // Add to the DOM for debugging purposes
        if (contentEl.value) {
          contentEl.value.innerHTML = "";
          contentEl.value.appendChild(downloadContainer);
        }

        throw new Error(`EPUB file validation failed: ${testResult.error}`);
      }
    }

    // Create a new parser instance
    epubParser.value = new EpubParser();

      // Try a more direct approach to fetch the file
    try {
      console.log("CustomEpubReader: Processing book content...");

      // Handle different URL types
      if (bookUrl.startsWith("data:")) {
        console.log("CustomEpubReader: Processing data URL...");
        try {
          // Data URL format: data:application/epub+zip;base64,BASE64DATA
          const base64Content = bookUrl.split(",")[1];
          if (!base64Content) {
            throw new Error("Invalid data URL format");
          }

          // Convert base64 to ArrayBuffer
          const binaryString = atob(base64Content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }

          const arrayBuffer = bytes.buffer;
          console.log(
            "CustomEpubReader: Data URL processed, size:",
            arrayBuffer.byteLength,
            "bytes"
          );

          // Load and parse the EPUB file
          await epubParser.value.loadFile(arrayBuffer);
        } catch (dataUrlError) {
          console.error("CustomEpubReader: Data URL processing error:", dataUrlError);
          throw new Error(`Failed to process data URL: ${dataUrlError.message}`);
        }
      } else if (bookUrl.startsWith("blob:")) {
        console.log("CustomEpubReader: Processing blob URL...");
        try {
          // Blob URL - fetch it normally
          const response = await fetch(bookUrl);
          if (!response.ok) {
            throw new Error(`Blob URL HTTP error! status: ${response.status}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          console.log(
            "CustomEpubReader: Blob data received, size:",
            arrayBuffer.byteLength,
            "bytes"
          );

          // Load and parse the EPUB file
          await epubParser.value.loadFile(arrayBuffer);
        } catch (blobError) {
          console.error("CustomEpubReader: Blob URL processing error:", blobError);
          throw new Error(`Failed to process blob URL: ${blobError.message}. The URL may have expired if the page was refreshed.`);
        }
      } else {
        console.log("CustomEpubReader: Fetching from normal URL...");
        try {
          // Regular URL - make a direct fetch
          const response = await fetch(bookUrl, {
            headers: {
              Accept: "application/octet-stream",
              "Content-Type": "application/octet-stream",
            },
            cache: "no-cache", // Try to bypass cache issues
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Get the raw binary data as ArrayBuffer
          const arrayBuffer = await response.arrayBuffer();
          console.log(
            "CustomEpubReader: Received file data, size:",
            arrayBuffer.byteLength,
            "bytes"
          );

          // Load and parse the EPUB file
          await epubParser.value.loadFile(arrayBuffer);
        } catch (fetchError) {
          console.error("CustomEpubReader: URL fetch error:", fetchError);
          throw new Error(`Failed to fetch EPUB file: ${fetchError.message}`);
        }
      }
    } catch (fetchError) {
      console.error(
        "CustomEpubReader: Error processing book data:",
        fetchError
      );
      throw new Error(`Failed to process book data: ${fetchError.message}`);
    }

    // Set book metadata
    bookMetadata.value = {
      title: epubParser.value.metadata.title || props.bookTitle,
      creator: epubParser.value.metadata.creator || "Unknown",
      publisher: epubParser.value.metadata.publisher || "",
    };

    totalChapters.value = epubParser.value.spine.length;

    // Restore reading position or start from beginning
    if (
      epubLocation.value &&
      typeof epubLocation.value.chapterIndex === "number"
    ) {
      currentChapterIndex.value = epubLocation.value.chapterIndex;
    } else {
      currentChapterIndex.value = 0;
    }

    // Load current chapter
    await loadChapter(currentChapterIndex.value);

    // Book is successfully loaded
    emit("book-loaded", {
      id: props.bookId,
      title: bookMetadata.value.title,
      metadata: epubParser.value.metadata,
    });

    isLoading.value = false;
  } catch (error) {
    console.error("CustomEpubReader: Error loading book:", error);
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

    // Go to specified chapter and get content with options
    const chapter = await epubParser.value.goToChapter(index, {
      numberParagraphs: showParagraphNumbers.value,
    });
    chapterContent.value = chapter.content;
    currentChapterIndex.value = chapter.index;

    // Update page info
    updatePageInfo();

    // Save current position
    epubLocation.value = {
      chapterIndex: currentChapterIndex.value,
      scrollPosition: 0,
    };

    isLoading.value = false;

    // After rendering, restore scroll position or process images
    await nextTick();
    if (contentEl.value) {
      // Process any images in the chapter
      processImages();

      // Restore scroll position if available
      if (
        epubLocation.value &&
        epubLocation.value.scrollPosition &&
        currentChapterIndex.value === epubLocation.value.chapterIndex
      ) {
        contentEl.value.scrollTop = epubLocation.value.scrollPosition;
      }
    }

    // Update progress
    updateProgress();
  } catch (error) {
    console.error("CustomEpubReader: Error loading chapter:", error);
    errorMessage.value = `Failed to load chapter: ${error.message}`;
    isLoading.value = false;
  }
};

// Process any images in the chapter - replace placeholders with actual images
const processImages = async () => {
  if (!contentEl.value || !epubParser.value) return;

  const images = contentEl.value.querySelectorAll("img[data-original-src]");
  for (const img of images) {
    try {
      const originalSrc = img.getAttribute("data-original-src");
      const baseDir = epubParser.value.spine[currentChapterIndex.value].href
        .split("/")
        .slice(0, -1)
        .join("/");
      const fullPath = baseDir ? `${baseDir}/${originalSrc}` : originalSrc;

      const imageUrl = await epubParser.value.getFileAsUrl(fullPath);
      img.src = imageUrl;
    } catch (error) {
      console.warn("CustomEpubReader: Error loading image:", error);
      // Keep placeholder on error
    }
  }
};

// Navigation functions
const nextChapter = async () => {
  if (currentChapterIndex.value < totalChapters.value - 1) {
    await loadChapter(currentChapterIndex.value + 1);
  }
};

const prevChapter = async () => {
  if (currentChapterIndex.value > 0) {
    await loadChapter(currentChapterIndex.value - 1);
  }
};

// Update page info (could add page number calculation in the future)
const updatePageInfo = () => {
  if (!epubParser.value) return;

  const currentChapter = currentChapterIndex.value + 1;
  const totalChapters = epubParser.value.spine.length;
  let tocLabel = "";

  // Try to find current chapter in TOC
  if (epubParser.value.toc.length > 0) {
    const findInToc = (items, href) => {
      for (const item of items) {
        if (
          item.href === epubParser.value.spine[currentChapterIndex.value].href
        ) {
          return item.label;
        }
        if (item.subitems && item.subitems.length > 0) {
          const found = findInToc(item.subitems, href);
          if (found) return found;
        }
      }
      return null;
    };

    tocLabel =
      findInToc(
        epubParser.value.toc,
        epubParser.value.spine[currentChapterIndex.value].href
      ) || "";
  }

  pageInfo.value = tocLabel
    ? `${tocLabel}`
    : `Chapter ${currentChapter}/${totalChapters}`;
};

// Calculate and emit reading progress
const updateProgress = () => {
  if (!epubParser.value) return;

  // Simple progress based on chapter position
  const progress = Math.round(
    (currentChapterIndex.value / (totalChapters.value - 1)) * 100
  );

  emit("progress-update", {
    progress,
    chapterIndex: currentChapterIndex.value,
    chapterTitle: pageInfo.value,
  });
};

// Handle scroll to save position
const handleScroll = () => {
  if (contentEl.value && !isLoading.value) {
    epubLocation.value = {
      chapterIndex: currentChapterIndex.value,
      scrollPosition: contentEl.value.scrollTop,
    };
  }
};

// Font size controls
const increaseFontSize = () => {
  emit("font-size-change", props.fontSize + 1);
};

const decreaseFontSize = () => {
  if (props.fontSize > 12) {
    emit("font-size-change", props.fontSize - 1);
  }
};

// Theme toggle
const toggleTheme = () => {
  emit("theme-toggle");
};

// Paragraph numbering toggle
const toggleParagraphNumbering = async () => {
  showParagraphNumbers.value = !showParagraphNumbers.value;
  // Save preference to localStorage
  localStorage.setItem(
    `paragraph-numbers-${props.bookId}`,
    showParagraphNumbers.value
  );
  // Reload current chapter with new setting
  await loadChapter(currentChapterIndex.value);
};

// Lifecycle hooks
onMounted(async () => {
  console.log("CustomEpubReader: Component mounted");

  // Load paragraph numbering preference from localStorage
  const savedParagraphNumbering = localStorage.getItem(
    `paragraph-numbers-${props.bookId}`
  );
  if (savedParagraphNumbering !== null) {
    showParagraphNumbers.value = savedParagraphNumbering === "true";
  }

  await loadBook();

  // Add scroll listener
  if (contentEl.value) {
    contentEl.value.addEventListener("scroll", handleScroll);
  }
});

onUnmounted(() => {
  // Clean up resources
  if (epubParser.value) {
    epubParser.value.cleanup();
  }

  // Remove scroll listener
  if (contentEl.value) {
    contentEl.value.removeEventListener("scroll", handleScroll);
  }
});

// Watch for theme or font size changes
watch(
  () => props.theme,
  () => {
    // No need to do anything, the computed styles will update
  }
);

watch(
  () => props.fontSize,
  () => {
    // No need to do anything, the computed styles will update
  }
);
</script>

<style scoped>
.epub-reader-container {
  height: 100%;
  width: 100%;
}

.reader-content {
  overflow-y: auto;
  position: relative;
}

.chapter-content {
  min-height: 100%;
}

.dark-mode {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

/* Style buttons in dark mode */
.dark-mode button {
  color: #e0e0e0;
}

.dark-mode button:hover {
  background-color: #374151;
}
</style>

<style>
/* These styles apply to the HTML content from the EPUB */
.chapter-content img {
  max-width: 100%;
  height: auto;
  margin: 1rem auto;
  display: block;
}

.chapter-content h1,
.chapter-content h2,
.chapter-content h3,
.chapter-content h4,
.chapter-content h5,
.chapter-content h6 {
  font-weight: bold;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.chapter-content p {
  margin-bottom: 1em;
  color: inherit !important;
  text-decoration: none !important;
}

/* Override any text styling to use default text colors */
.chapter-content {
  color: inherit !important;
}

/* Apply to all elements */
.chapter-content * {
  color: inherit !important;
  text-decoration: none !important;
}

/* Make sure paragraphs never get underlined, even on hover */
.chapter-content p,
.chapter-content p:hover {
  color: inherit !important;
  text-decoration: none !important;
}

/* Only apply link styling to actual anchor links */
.chapter-content a,
.chapter-content a:hover {
  color: inherit !important;
  text-decoration: none !important;
}

/* Add a small color change on hover for actual links, but no underline */
.chapter-content a:hover {
  opacity: 0.8;
}

.dark-mode .chapter-content a:hover {
  opacity: 0.8;
}
</style>

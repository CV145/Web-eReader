import { ref, computed } from "vue";
import { EpubParser } from "../utils/epubParser";

export function useEpubParser(debug = false) {
  const DEBUG_MODE = debug;
  const epubParser = ref(null);
  const currentChapterContent = ref("");
  const currentChapterIndex = ref(0);
  const totalChapters = ref(0);
  const bookMetadata = ref({
    title: "",
    creator: "",
    publisher: "",
  });
  const tableOfContents = ref([]);
  const isLoading = ref(true);
  const errorMessage = ref(null);

  // Initialize EPUB parser and load book
  const loadBook = async (bookUrl, bookTitle) => {
    try {
      console.log(
        "Starting to load book from:",
        bookUrl.substring(0, 50) + "..."
      );
      isLoading.value = true;
      errorMessage.value = null;

      // Check if book URL is valid
      if (!bookUrl) {
        throw new Error("No book URL provided");
      }

      // Create a new parser instance
      epubParser.value = new EpubParser();

      // Try to load the book
      try {
        // Handle different URL types
        if (bookUrl.startsWith("data:") || bookUrl.startsWith("blob:")) {
          const response = await fetch(bookUrl);
          const arrayBuffer = await response.arrayBuffer();
          await epubParser.value.loadFile(arrayBuffer);
        } else {
          const response = await fetch(bookUrl);
          const arrayBuffer = await response.arrayBuffer();
          await epubParser.value.loadFile(arrayBuffer);
        }
      } catch (fetchError) {
        console.error("Error processing book data:", fetchError);
        throw new Error(`Failed to process book data: ${fetchError.message}`);
      }

      // Set book metadata
      bookMetadata.value = {
        title: epubParser.value.metadata.title || bookTitle,
        creator: epubParser.value.metadata.creator || "Unknown",
        publisher: epubParser.value.metadata.publisher || "",
      };

      totalChapters.value = epubParser.value.spine.length;

      // Initialize TOC
      if (epubParser.value.toc && epubParser.value.toc.length > 0) {
        tableOfContents.value = getTableOfContents();
        console.log(
          `Table of contents loaded: ${tableOfContents.value.length} items`
        );
      }

      isLoading.value = false;
      return true;
    } catch (error) {
      console.error("Error loading book:", error);
      errorMessage.value = error.message || "Failed to load book";
      isLoading.value = false;
      return false;
    }
  };

  // Load specific chapter
  const loadChapter = async (index, showParagraphNumbers = false) => {
    try {
      isLoading.value = true;

      if (DEBUG_MODE) {
        console.log(`📖 LOADING CHAPTER ${index + 1}`);
      }

      // Go to specified chapter and get content with options
      const chapter = await epubParser.value.goToChapter(index, {
        numberParagraphs: showParagraphNumbers,
      });

      // Update chapter content
      currentChapterContent.value = chapter.content;
      currentChapterIndex.value = chapter.index;

      isLoading.value = false;
      return chapter;
    } catch (error) {
      console.error("Error loading chapter:", error);
      errorMessage.value = `Failed to load chapter: ${error.message}`;
      isLoading.value = false;
      throw error;
    }
  };

  // Process images in the EPUB content
  const processImages = async (contentEl) => {
    if (!contentEl) return;

    // Get all images in the content
    const images = contentEl.querySelectorAll("img");
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

  // Get flattened table of contents
  const getTableOfContents = () => {
    if (!epubParser.value || !epubParser.value.toc) {
      return [];
    }

    // Track processed chapter indexes to avoid duplicates
    const processedIndexes = new Set();

    // Helper function to flatten nested TOC
    const flattenToc = (items, level = 0) => {
      let result = [];

      items.forEach((item) => {
        // Get chapter index for deduplication
        const chapterIndex = getChapterIndexFromHref(item.href);

        // Only add items with valid indexes that haven't been processed yet
        // This prevents duplicate entries from appearing in the TOC
        if (chapterIndex >= 0 && !processedIndexes.has(chapterIndex)) {
          // Mark this index as processed to avoid duplicates
          processedIndexes.add(chapterIndex);

          // Add current item with its level
          result.push({
            id: `toc-${result.length}`,
            label: item.label,
            href: item.href,
            level: level,
            index: chapterIndex,
          });
        }

        // Add children if any (with deduplication)
        if (item.subitems && item.subitems.length > 0) {
          result = [...result, ...flattenToc(item.subitems, level + 1)];
        }
      });

      return result;
    };

    // Generate flattened TOC and sort by chapter index for proper ordering
    const tocItems = flattenToc(epubParser.value.toc);

    // Sort by chapter index to ensure correct order
    return tocItems.sort((a, b) => a.index - b.index);
  };

  // Helper function to get chapter index from href
  const getChapterIndexFromHref = (href) => {
    if (!href || !epubParser.value) {
      return -1;
    }

    // Find the spine item that matches this href
    const index = epubParser.value.spine.findIndex((item) => {
      return (
        item.href === href ||
        item.href.includes(href) ||
        href.includes(item.href)
      );
    });

    return index;
  };

  // Navigation methods
  const nextChapter = () => {
    if (currentChapterIndex.value < totalChapters.value - 1) {
      // Get the current paragraph numbering state from the last chapter load
      const currentOptions = epubParser.value?.currentChapterOptions || {};
      return loadChapter(
        currentChapterIndex.value + 1,
        currentOptions.numberParagraphs
      );
    }
    return null;
  };

  const previousChapter = () => {
    if (currentChapterIndex.value > 0) {
      // Get the current paragraph numbering state from the last chapter load
      const currentOptions = epubParser.value?.currentChapterOptions || {};
      return loadChapter(
        currentChapterIndex.value - 1,
        currentOptions.numberParagraphs
      );
    }
    return null;
  };

  return {
    epubParser,
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
    nextChapter,
    previousChapter,
    getTableOfContents,
    getChapterIndexFromHref,
  };
}

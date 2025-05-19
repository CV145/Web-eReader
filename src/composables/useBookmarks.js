import { ref } from "vue";

export function useBookmarks(bookId) {
  const bookmarks = ref([]);

  // Load bookmarks for current book
  const loadBookmarks = () => {
    if (!bookId) return;

    try {
      // Get from localStorage
      const storedBookmarks = localStorage.getItem(`bookmarks_${bookId}`);
      if (storedBookmarks) {
        bookmarks.value = JSON.parse(storedBookmarks);
        console.log(
          `Loaded ${bookmarks.value.length} bookmarks for book ${bookId}`
        );
      }
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      bookmarks.value = [];
    }
  };

  // Save bookmarks to localStorage
  const saveBookmarks = () => {
    if (!bookId) return;

    try {
      localStorage.setItem(
        `bookmarks_${bookId}`,
        JSON.stringify(bookmarks.value)
      );
    } catch (error) {
      console.error("Error saving bookmarks:", error);
    }
  };

  // Add a bookmark at current position
  const addBookmark = (
    contentEl,
    scrollContainer,
    currentChapterIndex,
    epubLocation,
    bookMetadata,
    specificParagraph = null
  ) => {
    let currentElement = null;
    let paragraphText = "";
    let paragraphIndex = -1;

    if (contentEl) {
      // If a specific paragraph was provided (via right-click or Alt+click)
      if (specificParagraph) {
        currentElement = specificParagraph;

        // Find the index of this paragraph
        const paragraphs = contentEl.querySelectorAll("p");
        for (let i = 0; i < paragraphs.length; i++) {
          if (paragraphs[i] === specificParagraph) {
            paragraphIndex = i;
            break;
          }
        }
      }
      // Otherwise find the paragraph at current scroll position
      else {
        const paragraphs = contentEl.querySelectorAll("p");
        const scrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

        // Find the paragraph closest to the current scroll position
        for (let i = 0; i < paragraphs.length; i++) {
          const paraElement = paragraphs[i];
          const paraPos = paraElement.offsetTop;

          if (paraPos >= scrollTop) {
            currentElement = paraElement;
            paragraphIndex = i;
            break;
          }
        }

        // If we didn't find one yet, use the last paragraph
        if (!currentElement && paragraphs.length > 0) {
          currentElement = paragraphs[paragraphs.length - 1];
          paragraphIndex = paragraphs.length - 1;
        }
      }
    }

    // Get paragraph text if we have a paragraph element
    if (currentElement) {
      // Get text content of paragraph (first 50 chars)
      paragraphText = currentElement.textContent.trim();
      if (paragraphText.length > 50) {
        paragraphText = paragraphText.substring(0, 50) + "...";
      }
    }

    // Create bookmark object
    const bookmark = {
      id: `bookmark-${Date.now()}`,
      chapterIndex: currentChapterIndex,
      chapterTitle:
        bookMetadata.title + ` (Chapter ${currentChapterIndex + 1})`,
      position: epubLocation?.scrollPosition || 0,
      paragraphIndex,
      paragraphText,
      createdAt: new Date().toISOString(),
    };

    // Add to bookmarks list
    bookmarks.value.push(bookmark);

    // Save to localStorage
    saveBookmarks();

    console.log(
      `Added bookmark at position ${bookmark.position} in chapter ${
        bookmark.chapterIndex + 1
      }`
    );

    return bookmark;
  };

  // Get all bookmarks
  const getBookmarks = () => {
    return bookmarks.value;
  };

  // Remove a bookmark by ID
  const removeBookmark = (bookmarkId) => {
    const index = bookmarks.value.findIndex((b) => b.id === bookmarkId);
    if (index !== -1) {
      bookmarks.value.splice(index, 1);
      saveBookmarks();
      console.log(`Removed bookmark ${bookmarkId}`);
      return true;
    }
    return false;
  };

  // Navigate to a specific bookmark
  const navigateToBookmark = (bookmark) => {
    // This function is just a stub - the actual navigation logic
    // will be implemented in the reader component that has access
    // to the chapter navigation functionality
    console.log(`Navigating to bookmark: ${bookmark.id}`);
    return bookmark;
  };

  return {
    bookmarks,
    loadBookmarks,
    saveBookmarks,
    addBookmark,
    getBookmarks,
    removeBookmark,
    navigateToBookmark,
  };
}

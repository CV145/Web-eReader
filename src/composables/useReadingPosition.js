import { ref } from "vue";

export function useReadingPosition(bookId, debug = false) {
  const epubLocation = ref(null);
  const readingProgress = ref(0);
  const DEBUG_MODE = debug;

  // Function to save reading position
  const saveReadingPosition = () => {
    if (!bookId) return;

    try {
      // Prepare position data
      const positionData = {
        chapterIndex: epubLocation.value.chapterIndex,
        scrollPosition: epubLocation.value.scrollPosition,
        savedAt: new Date().toISOString(),
      };

      // Only save if position is significant (not at the top)
      if (positionData.scrollPosition > 10) {
        // Save to localStorage and sessionStorage for redundancy
        const dataString = JSON.stringify(positionData);
        localStorage.setItem(`book-progress-${bookId}`, dataString);
        sessionStorage.setItem(`book-progress-${bookId}`, dataString);

        // Also store in window for immediate access
        window.lastSavedPosition = positionData;

        if (DEBUG_MODE) {
          // console.log(`📥 POSITION SAVED: Chapter ${positionData.chapterIndex + 1}, position ${Math.round(positionData.scrollPosition)}px`);
        }

        return positionData;
      }
    } catch (error) {
      console.error("Error saving reading position:", error);
    }
  };

  // Function to load the reading position
  const loadReadingPosition = () => {
    if (!bookId) return false;

    try {
      if (DEBUG_MODE) {
        console.log(`🔍 Attempting to load position for book ID: ${bookId}`);
      }

      // Try multiple sources in order of reliability
      let savedData = null;

      // Try window object first (most immediate)
      if (window.lastSavedPosition) {
        savedData = window.lastSavedPosition;
      }

      // Next try sessionStorage
      if (!savedData) {
        const sessionData = sessionStorage.getItem(`book-progress-${bookId}`);
        if (sessionData) {
          try {
            savedData = JSON.parse(sessionData);
          } catch (e) {}
        }
      }

      // Finally try localStorage
      if (!savedData) {
        const localData = localStorage.getItem(`book-progress-${bookId}`);
        if (localData) {
          try {
            savedData = JSON.parse(localData);
          } catch (e) {}
        }
      }

      if (savedData && typeof savedData.chapterIndex === "number") {
        // Ensure we have a valid scroll position or default to 0
        const scrollPosition =
          typeof savedData.scrollPosition === "number"
            ? savedData.scrollPosition
            : 0;

        epubLocation.value = {
          chapterIndex: savedData.chapterIndex,
          scrollPosition: scrollPosition,
        };

        if (DEBUG_MODE) {
          console.log(
            `📤 LOADED POSITION: Chapter ${
              savedData.chapterIndex + 1
            }, position ${Math.round(scrollPosition)}px`
          );
        }

        return true;
      }
    } catch (error) {
      console.error("Error loading reading position:", error);
    }

    return false;
  };

  // Update progress percentage
  const updateProgress = (currentChapterIndex, totalChapters) => {
    // Update overall progress percentage
    const progress = (currentChapterIndex / (totalChapters - 1)) * 100;
    readingProgress.value = Math.round(progress);

    // Store current progress data
    try {
      localStorage.setItem(
        `book-progress-percentage-${bookId}`,
        String(readingProgress.value)
      );
    } catch (e) {
      console.error("Error saving progress percentage:", e);
    }
  };

  return {
    epubLocation,
    readingProgress,
    saveReadingPosition,
    loadReadingPosition,
    updateProgress,
  };
}

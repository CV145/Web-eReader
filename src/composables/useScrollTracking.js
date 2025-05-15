import { onMounted, onUnmounted } from 'vue';

export function useScrollTracking(saveReadingPosition, debug = false) {
  const DEBUG_MODE = debug;
  
  // Function to apply scroll position
  const applyScrollPosition = (position, scrollContainer, contentEl) => {
    if (!position || position <= 0) return;
    
    // Find all possible scrollable containers
    const containers = [
      scrollContainer,
      contentEl,
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
  
  // Global scroll handler
  const handleGlobalScroll = (event, epubLocation, currentChapterIndex) => {
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
        if (epubLocation) {
          epubLocation.value = {
            chapterIndex: currentChapterIndex.value,
            scrollPosition: scrollPosition
          };
        }
        
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
  
  // Function to set up scroll tracking
  const setupScrollTracking = (epubLocation, currentChapterIndex) => {
    if (window.scrollHandlerAttached) return;
    
    if (DEBUG_MODE) {
      console.log('🔥 Setting up global scroll tracking');
    }
    
    // Create a safe handler that won't throw errors
    const safeScrollHandler = (event) => {
      try {
        if (event && event.target) {
          handleGlobalScroll(event, epubLocation, currentChapterIndex);
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
    
    // Clean up function
    const cleanup = () => {
      // Remove scroll listeners
      window.removeEventListener('scroll', safeScrollHandler);
      document.removeEventListener('scroll', safeScrollHandler);
      window.removeEventListener('wheel', () => {});
      
      // Clean up timeouts
      if (window.globalScrollSaveTimeout) {
        clearTimeout(window.globalScrollSaveTimeout);
      }
      
      // Mark as detached
      window.scrollHandlerAttached = false;
    };
    
    return cleanup;
  };
  
  // Handle scroll event for main content
  const handleScroll = (event, epubLocation, currentChapterIndex) => {
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
  
  return {
    applyScrollPosition,
    setupScrollTracking,
    handleScroll
  };
}

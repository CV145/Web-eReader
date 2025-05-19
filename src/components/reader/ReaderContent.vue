<!--ReaderContent.vue: Responsible for rendering chapter content and handling user interactions with the content-->

<template>
  <main
    ref="scrollContainer"
    class="reader-content flex-grow overflow-y-auto transition-colors duration-300"
    :class="{ 'dark-theme': isDarkMode }"
    :style="{
      fontSize: `${fontSize}px`,
      backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f7fa',
    }"
    @scroll="handleContentScroll"
  >
    <!-- Chapter content rendered here -->
    <div
      ref="contentEl"
      class="chapter-content-wrapper max-w-3xl mx-auto p-6 shadow-md min-h-full transition-colors duration-300"
      id="chapter-content-container"
      :class="{ 'dark-theme': isDarkMode }"
      :style="{
        backgroundColor: isDarkMode ? '#121212' : '#ffffff',
        color: isDarkMode ? '#e0e0e0' : '#333333',
      }"
      @contextmenu.prevent="handleContextMenu"
      @click="handleClick"
    >
      <div
        v-if="chapterContent"
        v-html="chapterContent"
        class="reader-content-html"
      ></div>
      <div
        v-else
        class="p-8 text-center"
        :style="{ color: isDarkMode ? '#aaaaaa' : '#666666' }"
      >
        No content to display
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, computed } from "vue";
import { useTheme } from "../../composables/useTheme";

const props = defineProps({
  chapterContent: {
    type: String,
    default: "",
  },
  fontSize: {
    type: Number,
    default: 18,
  },
  scrollPosition: {
    type: Number,
    default: 0,
  },
  showParagraphNumbers: {
    type: Boolean,
    default: false,
  },
});

// Get theme information
const { isDarkMode } = useTheme();

const emit = defineEmits(["scroll"]);

// Refs for DOM elements
const contentEl = ref(null);
const scrollContainer = ref(null);

// Handle scroll events
const handleContentScroll = (event) => {
  emit("scroll", event);
};

// Handle right-click (context menu) events for creating bookmarks
const handleContextMenu = (event) => {
  // Find the closest paragraph element
  const paragraph = findClosestParagraph(event.target);
  if (paragraph) {
    // Emit event to create a bookmark with this paragraph
    emit("create-bookmark", paragraph);
    // Show a small visual feedback
    showBookmarkFeedback(paragraph);
  }
};

// Handle click events on bookmark icons (using event delegation)
const handleClick = (event) => {
  // Check if Alt key was pressed during click (existing functionality)
  if (event.altKey) {
    const paragraph = findClosestParagraph(event.target);
    if (paragraph) {
      emit("create-bookmark", paragraph);
      showBookmarkFeedback(paragraph);
      event.preventDefault();
    }
    return;
  }

  // Check if the click was on the bookmark icon
  if (event.target.classList.contains("bookmark-icon")) {
    const paragraph = findClosestParagraph(event.target);
    if (paragraph) {
      emit("create-bookmark", paragraph);
      showBookmarkFeedback(paragraph);
      event.preventDefault();
      event.stopPropagation();
    }
    return;
  }
};

// Find the closest paragraph element to the current target
const findClosestParagraph = (element) => {
  // If the element itself is a paragraph, return it
  if (element.tagName === "P") {
    return element;
  }

  // Check if the element is within a paragraph
  let current = element;
  while (current && current !== contentEl.value) {
    if (current.tagName === "P") {
      return current;
    }
    current = current.parentElement;
  }

  // If no paragraph found, return null
  return null;
};

// Show a visual feedback when a bookmark is created
const showBookmarkFeedback = (paragraph) => {
  // Create a temporary visual indicator
  const feedback = document.createElement("div");
  feedback.textContent = "🔖 Bookmark added";
  feedback.style.position = "absolute";
  feedback.style.left = `${paragraph.offsetLeft + paragraph.offsetWidth / 2}px`;
  feedback.style.top = `${paragraph.offsetTop - 30}px`;
  feedback.style.backgroundColor = isDarkMode.value ? "#444" : "#fff";
  feedback.style.color = isDarkMode.value ? "#fff" : "#333";
  feedback.style.padding = "5px 10px";
  feedback.style.borderRadius = "4px";
  feedback.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  feedback.style.opacity = "0";
  feedback.style.transform = "translateX(-50%)";
  feedback.style.transition = "opacity 0.3s, transform 0.3s";
  feedback.style.zIndex = "100";

  // Add to DOM
  contentEl.value.appendChild(feedback);

  // Show the feedback with a slight delay
  setTimeout(() => {
    feedback.style.opacity = "1";
    feedback.style.transform = "translateX(-50%) translateY(-10px)";
  }, 10);

  // Remove after animation completes
  setTimeout(() => {
    feedback.style.opacity = "0";
    feedback.style.transform = "translateX(-50%) translateY(-20px)";

    setTimeout(() => {
      contentEl.value.removeChild(feedback);
    }, 300);
  }, 2000);
};

// Process the chapter content to add paragraph numbers if needed
// and add bookmark event handlers to paragraphs
const processedContent = computed(() => {
  if (!props.chapterContent) return "";

  // Create a DOM parser to work with the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(props.chapterContent, "text/html");

  // Get all paragraphs
  const paragraphs = doc.querySelectorAll("p");

  // Add bookmark icon event handlers to each paragraph
  paragraphs.forEach((p, index) => {
    // Add a data attribute to help identify paragraphs
    p.dataset.paragraphIndex = index;

    // Create a bookmark icon element
    const bookmarkIcon = doc.createElement("span");
    bookmarkIcon.className = "bookmark-icon";
    bookmarkIcon.textContent = "🔖";

    // Add the bookmark icon to the paragraph
    p.appendChild(bookmarkIcon);
  });

  // If paragraph numbering is disabled, return the modified content
  if (!props.showParagraphNumbers) return doc.body.innerHTML;

  // Add paragraph numbers if enabled
  paragraphs.forEach((p, index) => {
    // Create a wrapper for the paragraph
    const wrapper = doc.createElement("div");
    wrapper.className = "paragraph-numbered";
    wrapper.dataset.paragraphIndex = index;

    // Create the number element
    const numElement = doc.createElement("span");
    numElement.className = "paragraph-number";
    numElement.textContent = `${index + 1}`;

    // Clone the paragraph
    const pClone = p.cloneNode(true);

    // Add to wrapper
    wrapper.appendChild(numElement);
    wrapper.appendChild(pClone);

    // Replace the original paragraph with the wrapper
    p.parentNode.replaceChild(wrapper, p);
  });

  // Return the modified HTML content
  return doc.body.innerHTML;
});

// Apply scroll position when it changes - use a simpler approach
let isInitialPosition = true;
watch(
  () => props.scrollPosition,
  (newPosition) => {
    if (newPosition > 0 && scrollContainer.value) {
      // Only log if this is the initial position or it changes significantly
      if (
        isInitialPosition ||
        Math.abs(scrollContainer.value.scrollTop - newPosition) > 50
      ) {
        console.log(`Setting scroll position to ${newPosition}px`);
      }

      // Apply position once and directly
      scrollContainer.value.scrollTop = newPosition;

      // Mark that we've handled the initial position
      isInitialPosition = false;
    }
  }
);

// Apply scroll position when component is mounted - single attempt
onMounted(() => {
  if (props.scrollPosition > 0) {
    // Apply once with a delay to ensure DOM is ready
    setTimeout(() => {
      if (scrollContainer.value) {
        console.log(
          `Setting initial scroll position on mount: ${props.scrollPosition}px`
        );
        scrollContainer.value.scrollTop = props.scrollPosition;
      }
    }, 100);
  }
});

// Expose DOM elements and methods to parent
defineExpose({
  contentEl,
  scrollContainer,
});
</script>

<style scoped>
/* Force correct theme styling to chapter content */
.reader-content-html :deep(a) {
  color: var(--highlight-color);
}

.reader-content-html :deep(h1),
.reader-content-html :deep(h2),
.reader-content-html :deep(h3),
.reader-content-html :deep(h4),
.reader-content-html :deep(h5),
.reader-content-html :deep(h6) {
  color: inherit;
  margin-bottom: 0.5em;
}

.reader-content-html :deep(p) {
  margin-bottom: 1em;
  line-height: 1.6;
  position: relative; /*Absolute positioning of bookmark icon*/
}

/* Add styles for numbered paragraphs */
.reader-content-html :deep(.paragraph-numbered) {
  position: relative;
  padding-left: 2.5rem;
  margin-bottom: 1em;
}

/* Create the bookmark icon container that appears on hover */
.reader-content-html :deep(p) {
  position: relative;
  /* Add padding to make room for the bookmark icon */
  padding-right: 30px;
}

/* Style for the bookmark icon itself */
.reader-content-html :deep(.bookmark-icon) {
  position: absolute;
  right: -30px;
  top: 0;
  width: 24px;
  height: 24px;
  display: none; /* Hidden by default */
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  z-index: 50;
}

/* Show bookmark icon when paragraph is hovered */
.reader-content-html :deep(p:hover) .reader-content-html :deep(.bookmark-icon) {
  display: flex;
}

/* Keep the icon visible when hovering over the icon itself */
.reader-content-html :deep(.bookmark-icon:hover) {
  transform: scale(1.1);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

/* Dark mode style for the bookmark icon */
.dark-theme .reader-content-html :deep(.bookmark-icon) {
  background-color: rgba(50, 50, 50, 0.8);
}

/* Remove the old pseudo-element approach */
.reader-content-html :deep(p:hover::after) {
  content: none;
}

.reader-content-html :deep(.paragraph-number) {
  position: absolute;
  left: 0;
  top: 0;
  display: inline-block;
  width: 2rem;
  text-align: right;
  font-size: 0.85em;
  color: #888 !important;
  font-weight: 500;
  padding-right: 0.5rem;
}

.dark-theme .reader-content-html :deep(.paragraph-number) {
  color: #666 !important;
}

/* Force the right text color for all content */
.dark-theme .reader-content-html :deep(*) {
  color: #e0e0e0 !important;
}

.reader-content-html :deep(*) {
  color: #333333 !important;
}

/* Exception for links */
.dark-theme .reader-content-html :deep(a) {
  color: #60a5fa !important;
}

.reader-content-html :deep(a) {
  color: #4f46e5 !important;
}

.reader-content {
  /* Disable smooth scrolling to allow immediate position jumps */
  scroll-behavior: auto !important;
}

.chapter-content-wrapper {
  min-height: 95vh;
  line-height: 1.6;
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

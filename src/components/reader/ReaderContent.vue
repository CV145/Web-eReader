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

// Process the chapter content to add paragraph numbers if needed
const processedContent = computed(() => {
  if (!props.chapterContent) return "";

  // If paragraph numbering is disabled, return the original content
  if (!props.showParagraphNumbers) return props.chapterContent;

  // Add paragraph numbers by wrapping each paragraph in a container with a number
  const parser = new DOMParser();
  const doc = parser.parseFromString(props.chapterContent, "text/html");
  const paragraphs = doc.querySelectorAll("p");

  // Add numbers to each paragraph
  paragraphs.forEach((p, index) => {
    // Create a wrapper for the paragraph
    const wrapper = doc.createElement("div");
    wrapper.className = "paragraph-numbered";

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
}

/* Add styles for numbered paragraphs */
.reader-content-html :deep(.paragraph-numbered) {
  position: relative;
  padding-left: 2.5rem;
  margin-bottom: 1em;
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

<template>
  <div class="library">
    <div
      class="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md min-h-[70vh]"
    >
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Your Library</h1>

        <div class="flex items-center space-x-4">
          <!-- Add Book Button -->
          <button
            @click="openFileUpload"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <span class="mr-2">+ Add Book</span>
          </button>
        </div>

        <!-- Hidden file input -->
        <input
          type="file"
          ref="fileInput"
          accept=".epub"
          class="hidden"
          @change="handleFileUpload"
        />
      </div>

      <!-- Upload Progress -->
      <div
        v-if="uploadStatus"
        class="mb-6 p-4 rounded-lg"
        :class="{
          'bg-red-100': uploadStatus.type === 'error',
          'bg-green-100': uploadStatus.type === 'success',
          'bg-yellow-100': uploadStatus.type === 'warning',
          'bg-blue-100': uploadStatus.type === 'loading',
        }"
      >
        <div class="flex items-center">
          <span
            v-if="uploadStatus.type === 'loading'"
            class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-600 mr-2"
          ></span>
          <span
            v-else-if="uploadStatus.type === 'success'"
            class="text-green-600 text-xl mr-2"
            >✓</span
          >
          <span
            v-else-if="uploadStatus.type === 'error'"
            class="text-red-600 text-xl mr-2"
            >✗</span
          >
          <span
            v-else-if="uploadStatus.type === 'warning'"
            class="text-yellow-600 text-xl mr-2"
            >⚠️</span
          >
          <p
            :class="{
              'text-red-600': uploadStatus.type === 'error',
              'text-green-600': uploadStatus.type === 'success',
              'text-yellow-600': uploadStatus.type === 'warning',
              'text-blue-600': uploadStatus.type === 'loading',
            }"
          >
            {{ uploadStatus.message }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Display books from the store -->
        <div
          v-for="book in books"
          :key="book.id"
          class="book-item bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col h-[400px]"
        >
          <!-- Cover Image Section - Fixed Height -->
          <div class="aspect-w-2 aspect-h-3 bg-gray-200 mb-3 rounded relative">
            <!-- Status Indicator for Unavailable Books -->
            <div
              v-if="book.status === 'unavailable'"
              class="absolute inset-0 bg-gray-600 bg-opacity-70 flex items-center justify-center text-white p-2 text-center"
            >
              <div>
                <span class="text-xl">⚠️</span>
                <p class="text-xs mt-1">Book data unavailable</p>
              </div>
            </div>

            <div
              v-else-if="book.status === 'corrupt'"
              class="absolute inset-0 bg-red-600 bg-opacity-70 flex items-center justify-center text-white p-2 text-center"
            >
              <div>
                <span class="text-xl">⚠️</span>
                <p class="text-xs mt-1">Book data corrupted</p>
              </div>
            </div>

            <!-- Book Cover - Show actual cover or placeholder -->
            <div class="h-full w-full relative">
              <!-- Actual book cover image if available -->
              <img
                v-if="book.coverUrl"
                :src="book.coverUrl"
                alt="Book Cover"
                class="w-full h-full object-cover rounded absolute inset-0"
              />

              <!-- Placeholder if no cover image is available -->
              <div
                v-else
                class="flex flex-col items-center justify-center h-full bg-gray-100 rounded"
              >
                <div
                  class="w-16 h-16 mb-2 flex items-center justify-center bg-gray-200 rounded-full"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <p class="text-xs text-gray-400 text-center line-clamp-2">
                  {{ book.title }}
                </p>
              </div>
            </div>

            <!-- Favorite badge -->
            <button
              @click="toggleFavorite(book.id)"
              class="absolute top-2 right-2 text-gray-400 hover:text-red-500"
              :class="{ 'text-red-500': book.favorite }"
            >
              <span v-if="book.favorite">★</span>
              <span v-else>☆</span>
            </button>
          </div>

          <!-- Book Info Section - Fixed Height -->
          <div class="min-h-[60px]">
            <h3 class="font-medium line-clamp-1">{{ book.title }}</h3>
            <p class="text-sm text-gray-600">{{ book.author }}</p>
          </div>

          <!-- Progress Section - Always Takes Space -->
          <div class="h-[40px] mt-2">
            <div v-if="book.progress > 0">
              <div class="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  class="bg-indigo-600 h-1.5 rounded-full"
                  :style="{ width: `${Math.round(book.progress * 100)}%` }"
                ></div>
              </div>
              <p class="text-xs text-gray-500 mt-1">
                {{ Math.round(book.progress * 100) }}% read
              </p>
            </div>
          </div>

          <!-- Buttons Section - Consistent Layout -->
          <div class="mt-auto pt-3">
            <div class="flex flex-col space-y-2">
              <!-- Top row - Read button -->
              <div class="w-full">
                <template
                  v-if="
                    book.status === 'unavailable' || book.status === 'corrupt'
                  "
                >
                  <button
                    class="w-full text-sm bg-gray-400 text-white px-3 py-1 rounded cursor-not-allowed"
                    title="Book data is no longer available"
                    @click="notifyUnavailableBook(book)"
                  >
                    Read
                  </button>
                </template>
                <template v-else>
                  <router-link
                    :to="'/reader'"
                    class="block w-full text-center text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 transition-colors"
                    @click="openBook(book.id)"
                  >
                    Read
                  </router-link>
                </template>
              </div>

              <!-- Bottom row - Other buttons -->
              <div class="grid grid-cols-3 gap-2">
                <button
                  class="text-sm bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition-colors"
                  @click="showBookInfo(book.id)"
                >
                  Info
                </button>

                <button
                  class="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
                  @click="confirmDeleteBook(book)"
                  title="Delete this book from your library"
                >
                  Delete
                </button>

                <!-- Re-upload button - hidden when not needed but space reserved -->
                <button
                  v-if="
                    book.status === 'unavailable' || book.status === 'corrupt'
                  "
                  class="text-sm bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition-colors"
                  @click="openFileUpload()"
                  title="Upload a new copy of this book"
                >
                  Re-upload
                </button>
                <div v-else></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <router-link
          to="/"
          class="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors mr-4"
        >
          Back to Home
        </router-link>

        <router-link
          to="/reader"
          class="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Open Reader
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useLibraryStore } from "../stores/libraryStore";
import { nanoid } from "nanoid";
import {
  restoreUploadedBooks,
  checkStorageAvailability,
} from "../utils/bookStorage";
import { storeWithChunking, clearChunks } from "../utils/storageUtils";
import {
  storeBookData,
  isIndexedDBAvailable,
  deleteBookData,
} from "../utils/indexedDbStorage";
import { forcePersist, verifyBookRemoved } from "../utils/storeHelper";
import { EpubParser } from "../utils/epubParser";

const router = useRouter();
const libraryStore = useLibraryStore();

// UI state
const uploadStatus = ref(null);
const storageStatus = ref(null);

// Use a computed property to ensure reactivity when the store changes
const books = computed(() => libraryStore.getBooks);

// File upload refs and state
const fileInput = ref(null);

// Book actions
const openBook = (bookId) => {
  libraryStore.setCurrentBook(bookId);
  // Router navigation happens via the router-link
};

const toggleFavorite = (bookId) => {
  libraryStore.toggleFavorite(bookId);
};

const showBookInfo = (bookId) => {
  // For now, we'll just show a simple alert with book info
  const book = libraryStore.getBookById(bookId);
  alert(
    `${book.title} by ${book.author}\nAdded: ${new Date(
      book.addedDate
    ).toLocaleDateString()}\nProgress: ${Math.round(book.progress * 100)}%`
  );
};

// Notify user about unavailable book data
const notifyUnavailableBook = (book) => {
  uploadStatus.value = {
    type: "error",
    message: `"${book.title}" is no longer available. Please re-upload the book.`,
  };

  // Scroll to top to ensure the message is visible
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (uploadStatus.value?.type === "error") {
      uploadStatus.value = null;
    }
  }, 5000);
};

// Handle book deletion with confirmation
const confirmDeleteBook = async (book) => {
  // Store the book information for reference after deletion
  const bookId = book.id;
  const bookTitle = book.title;

  // Show confirmation dialog
  const isConfirmed = confirm(
    `Are you sure you want to delete "${bookTitle}" from your library?\n\nThis action cannot be undone.`
  );

  if (isConfirmed) {
    // Show loading state
    uploadStatus.value = {
      type: "loading",
      message: `Deleting "${bookTitle}"...`,
    };

    try {
      // Delete the book and wait for the operation to complete
      await deleteBook(book);

      // Force the Pinia store to save its state to localStorage
      forcePersist(libraryStore);

      // Verify the book was actually removed
      const isRemoved = verifyBookRemoved(libraryStore, bookId);
      if (!isRemoved) {
        console.warn(
          `Book ${bookId} may not have been completely removed. Forcing another cleanup...`
        );
        // Try removing it again directly from the store
        libraryStore.removeBook(bookId);
        libraryStore.$patch((state) => {
          state.collections.forEach((collection) => {
            const index = collection.bookIds.indexOf(bookId);
            if (index !== -1) {
              collection.bookIds.splice(index, 1);
            }
          });
          if (state.currentBookId === bookId) {
            state.currentBookId = null;
          }
        });
        // Force persistence again
        forcePersist(libraryStore);
      }

      // Show success message
      uploadStatus.value = {
        type: "success",
        message: `"${bookTitle}" has been removed from your library`,
      };

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        if (uploadStatus.value?.type === "success") {
          uploadStatus.value = null;
        }
      }, 3000);
    } catch (error) {
      console.error("Error during book deletion:", error);
      uploadStatus.value = {
        type: "error",
        message: `Error deleting "${bookTitle}": ${error.message}`,
      };
    }
  }
};

// Perform the actual book deletion
const deleteBook = async (book) => {
  try {
    console.log(`Deleting book: ${book.id} - ${book.title}`);

    // All books are treated as user-uploaded now
    {
      console.log(`Deleting uploaded book data for: ${book.id}`);
      const storageKey = `book_data_${book.id}`;

      // For large books or books explicitly stored in IndexedDB
      if (isIndexedDBAvailable()) {
        // Always try to delete from IndexedDB, regardless of storageType
        // This ensures we clean up any data that might have been stored there
        try {
          console.log(`Attempting to delete ${book.id} from IndexedDB...`);
          const deleted = await deleteBookData(storageKey);
          if (deleted) {
            console.log(
              `Successfully removed book data for ${book.id} from IndexedDB`
            );
          } else {
            console.log(
              `No data found for ${book.id} in IndexedDB or deletion not confirmed`
            );
          }
        } catch (e) {
          console.error(`Error while deleting ${book.id} from IndexedDB:`, e);
          // Continue with deletion process despite error
        }
      }

      // Always clean up localStorage too
      console.log(`Clearing all chunks for ${book.id} from localStorage...`);
      clearChunks(storageKey);

      // Double-check direct localStorage keys too
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`book_progress_${book.id}`);

      console.log(`Completed localStorage cleanup for ${book.id}`);

      // If the book has a blob URL, revoke it to free up memory
      if (book.url && book.url.startsWith("blob:")) {
        URL.revokeObjectURL(book.url);
        console.log(`Revoked blob URL for ${book.id}`);
      }
    }

    // Remove the book from the library store
    libraryStore.removeBook(book.id);

    // Force an immediate save of the library state
    libraryStore.$patch((state) => {
      // Explicitly remove this book ID from any collections
      state.collections.forEach((collection) => {
        const index = collection.bookIds.indexOf(book.id);
        if (index !== -1) {
          collection.bookIds.splice(index, 1);
        }
      });

      // Make sure it's not the current book
      if (state.currentBookId === book.id) {
        state.currentBookId = null;
      }
    });

    // Manually trigger a save to localStorage
    libraryStore.$persist();

    console.log(`Book ${book.id} completely removed from the library store`);

    // No need for success message here - it will be shown by the calling function
  } catch (error) {
    console.error("Error deleting book:", error);

    // Show error message
    uploadStatus.value = {
      type: "error",
      message: `Error deleting "${book.title}": ${error.message}`,
    };
  }
};

// Initialize and restore uploaded books when component mounts
onMounted(async () => {
  console.log("LibraryView: Restoring uploaded books from localStorage");

  // Check storage availability
  storageStatus.value = checkStorageAvailability();
  console.log("LibraryView: Storage status:", storageStatus.value);

  // Restore uploaded books (now using async/await since it's an async function)
  try {
    // Use a loading state for UI feedback
    uploadStatus.value = {
      type: "loading",
      message: "Restoring your library...",
    };

    const updatedBooks = await restoreUploadedBooks(books.value);

    // Update any books that needed restoration
    updatedBooks.forEach((book) => {
      if (book.status === "unavailable") {
        // Update UI status for unavailable books
        console.warn(`LibraryView: Book ${book.id} is unavailable`);
      } else if (
        book.url &&
        book.url !== libraryStore.getBookById(book.id).url
      ) {
        // Update the book URL in the store if it has changed
        libraryStore.updateBook(book.id, {
          url: book.url,
        });
        console.log(`LibraryView: Restored URL for book ${book.id}`);
      }
    });

    console.log("LibraryView: Finished restoring uploaded books");

    // Clear loading status
    uploadStatus.value = null;
  } catch (error) {
    console.error("LibraryView: Error restoring books:", error);
    uploadStatus.value = {
      type: "error",
      message: "Error restoring your library",
    };
  }
});

// File upload methods
const openFileUpload = () => {
  fileInput.value.click();
};

const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Check if it's an EPUB file
  if (!file.name.toLowerCase().endsWith(".epub")) {
    uploadStatus.value = {
      type: "error",
      message: "Only EPUB files are supported",
    };
    return;
  }

  try {
    // Show loading status
    uploadStatus.value = {
      type: "loading",
      message: `Uploading ${file.name}...`,
    };

    // Generate a unique ID for the book
    const id = nanoid(10); // 10 character ID
    const fileName = `${id}.epub`;

    // Extract basic metadata from the file name
    let title = file.name.replace(/\.epub$/i, "").replace(/[-_]/g, " ");

    // Create a blob URL for the file to be used by the reader
    const fileBlob = new Blob([await file.arrayBuffer()], {
      type: "application/epub+zip",
    });
    const fileUrl = URL.createObjectURL(fileBlob);

    // Extract cover image and metadata from the EPUB file
    let coverImageUrl = null;
    let author = "Unknown Author";

    try {
      // Create a temporary EPUB parser to extract the cover and metadata
      const parser = new EpubParser();
      await parser.loadFile(await file.arrayBuffer());

      // Get metadata if available
      if (parser.metadata) {
        if (parser.metadata.title) title = parser.metadata.title;
        if (parser.metadata.creator) author = parser.metadata.creator;
      }

      // Extract cover image
      coverImageUrl = await parser.extractCoverImage();

      // Clean up the parser
      parser.cleanup();

      console.log("Extracted metadata:", { title, author });
      console.log("Cover image extracted:", coverImageUrl ? "Yes" : "No");
    } catch (metadataError) {
      console.error("Error extracting metadata or cover:", metadataError);
      // Continue without metadata or cover if extraction fails
    }

    // Save the file data for persistence across sessions
    try {
      // Check file size before attempting to store
      const fileSizeInMB = file.size / (1024 * 1024);
      console.log(`File size: ${fileSizeInMB.toFixed(2)} MB`);

      // Convert file to base64 data URL
      const base64Data = await fileToBase64(file);
      console.log(
        `File converted to base64, length: ${base64Data.length} characters`
      );

      // For larger files (over 2MB), try IndexedDB first if available
      let stored = false;
      const storageKey = `book_data_${id}`;

      if (fileSizeInMB > 2 && isIndexedDBAvailable()) {
        console.log(
          `Using IndexedDB storage for large file (${fileSizeInMB.toFixed(
            2
          )} MB)`
        );
        stored = await storeBookData(storageKey, base64Data);

        if (stored) {
          console.log(`File successfully stored in IndexedDB`);
          // Mark the book as stored in IndexedDB for future reference
          libraryStore.updateBook(id, {
            storageType: "indexeddb",
          });
        }
      }

      // For smaller files or if IndexedDB fails, fall back to localStorage with chunking
      if (!stored) {
        console.log(`Using localStorage with chunking`);
        stored = storeWithChunking(storageKey, base64Data);

        if (stored) {
          console.log(`File successfully stored in localStorage with chunking`);
          libraryStore.updateBook(id, {
            storageType: "localstorage",
          });
        }
      }

      if (stored) {
        // Show success message with storage type info
        uploadStatus.value = {
          type: "success",
          message: `"${title}" (${fileSizeInMB.toFixed(
            2
          )} MB) has been added to your library`,
        };
      } else {
        // Storage failed despite all attempts
        throw new Error("Failed to store file data in any available storage");
      }
    } catch (storageError) {
      console.error("Storage error:", storageError);
      uploadStatus.value = {
        type: "warning",
        message: `"${title}" added but may not persist across sessions: ${storageError.message}`,
      };
      // Continue with just the blob URL if storage fails
      // This means the book won't persist across browser sessions
    }

    // Add the book to the library store
    libraryStore.addBook({
      id,
      title,
      author, // Now using the extracted author name
      format: "EPUB",
      progress: 0,
      favorite: false,
      addedDate: new Date().toISOString(),
      filePath: fileName,
      url: fileUrl, // Store the blob URL for immediate use
      coverUrl: coverImageUrl, // Store the extracted cover image URL
    });

    // Show success message
    uploadStatus.value = {
      type: "success",
      message: `"${title}" has been added to your library`,
    };

    // Clear the file input
    event.target.value = "";

    // Hide success message after 5 seconds
    setTimeout(() => {
      if (uploadStatus.value?.type === "success") {
        uploadStatus.value = null;
      }
    }, 5000);
  } catch (error) {
    console.error("Upload error:", error);
    uploadStatus.value = {
      type: "error",
      message: `Error uploading file: ${error.message}`,
    };
  }
};

// Helper function to convert file to base64 for storage
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};
</script>

# Book Storage in Web eReader

This document outlines how books are stored and managed in the Web eReader application.

## Directory Structure

```
public/
└── books/
    ├── covers/       # Book cover images
    └── [book files]  # EPUB, PDF, and other book formats
```

## File Naming Convention

Books are stored with a consistent naming convention:

- Book files: `[id].[format]` (e.g., `alice.epub`)
- Cover images: `[id].[jpg|png]` (e.g., `alice.jpg`)

The `id` is the unique identifier used in the library store to reference the book.

## Book Data Structure

In the library store, each book is represented by an object with the following structure:

```javascript
{
  id: 'unique-id',                 // Unique identifier for the book
  title: 'Book Title',             // Title of the book
  author: 'Author Name',           // Author of the book
  cover: '/books/covers/id.jpg',   // Path to cover image (can be null)
  format: 'epub',                  // File format (epub, pdf, etc.)
  filePath: '/books/id.epub',      // Path to the book file
  progress: 0,                     // Reading progress (percentage)
  lastRead: 'timestamp',           // Last read timestamp (can be null)
  favorite: false,                 // Whether the book is favorited
  addedDate: 'timestamp'           // When the book was added
}
```

## Adding New Books

When adding new books to the application:

1. Save the book file to `/public/books/[id].[format]`
2. If available, save the cover image to `/public/books/covers/[id].[jpg|png]`
3. Add an entry to the library store with the book's metadata and file paths

## Book Storage Location

During development, books are stored in the `public` directory so they can be served directly by the development server.

In production, books will be:
1. Included in the application bundle if they are default/sample books
2. Managed by the user's browser using the File System Access API or browser storage mechanisms
3. If building a desktop application (e.g., with Electron), books can be stored in a designated app directory

## Future Enhancements

- Implement book import/upload functionality
- Add cloud storage integration
- Support for library backup and restoration
- Automatic cover image extraction from EPUB files

/**
 * Custom EPUB Parser Utility
 * A lightweight utility to parse and render EPUB files without third-party libraries
 */
import JSZip from "jszip";

export class EpubParser {
  constructor() {
    this.zip = null;
    this.content = null;
    this.metadata = {
      title: "",
      creator: "",
      language: "",
      publisher: "",
      identifier: "",
    };
    this.manifest = {};
    this.spine = [];
    this.toc = [];
    this.currentSpineIndex = 0;
    this.baseUrl = "";
    this.coverPath = null; // Add property to store cover path
  }

  /**
   * Load an EPUB file from a URL or ArrayBuffer
   * @param {string|ArrayBuffer} input - URL to the EPUB file or ArrayBuffer containing the EPUB data
   * @returns {Promise<EpubParser>} - Returns this instance for chaining
   */
  async loadFile(input) {
    try {
      let arrayBuffer;

      // Check if input is already an ArrayBuffer
      if (input instanceof ArrayBuffer) {
        console.log("EpubParser: Using provided ArrayBuffer directly");
        arrayBuffer = input;
        this.baseUrl = "memory"; // Just a placeholder
      } else {
        // Input is a URL, fetch it
        console.log("EpubParser: Fetching EPUB from URL:", input);
        try {
          const response = await fetch(input, {
            // Explicitly request the file as binary data
            headers: {
              Accept: "application/octet-stream",
            },
          });

          if (!response.ok) {
            throw new Error(
              `Failed to fetch EPUB: ${response.status} ${response.statusText}`
            );
          }

          // Use arrayBuffer instead of blob for better compatibility with JSZip
          arrayBuffer = await response.arrayBuffer();
          this.baseUrl = input; // Save URL for reference
        } catch (fetchError) {
          console.error("EpubParser: Fetch error:", fetchError);
          throw new Error(`Failed to fetch EPUB: ${fetchError.message}`);
        }
      }

      console.log(
        "EpubParser: EPUB data received, buffer size:",
        arrayBuffer.byteLength,
        "bytes"
      );

      if (arrayBuffer.byteLength === 0) {
        throw new Error("EPUB buffer is empty (zero bytes)");
      }

      // Load the zip file with arrayBuffer data
      console.log("EpubParser: Initializing JSZip...");
      this.zip = new JSZip();
      console.log("EpubParser: Loading ZIP data...");
      try {
        const zipData = await JSZip.loadAsync(arrayBuffer, {
          base64: false,
          checkCRC32: true, // Enable validation
        });
        this.zip = zipData;
        console.log(
          "EpubParser: ZIP loaded successfully. Files found:",
          Object.keys(zipData.files).length
        );
      } catch (zipError) {
        console.error("EpubParser: JSZip error:", zipError);
        throw new Error(`Failed to parse EPUB as ZIP: ${zipError.message}`);
      }

      // Parse the container.xml to find the OPF file
      await this.parseContainer();

      // Parse the OPF file to get metadata, manifest, and spine
      await this.parseOPF();

      // Parse the TOC (navigation)
      await this.parseTOC();

      console.log("EpubParser: EPUB loaded and parsed successfully");
      return this;
    } catch (error) {
      console.error("EpubParser: Error loading EPUB:", error);
      throw error;
    }
  }

  /**
   * Parse the container.xml file to find the OPF file path
   * @returns {Promise<void>}
   */
  async parseContainer() {
    try {
      // List all files in the zip to debug
      console.log("EpubParser: Files in EPUB:");
      const fileKeys = Object.keys(this.zip.files);
      fileKeys.forEach((file) => {
        console.log(
          `  - ${file}${this.zip.files[file].dir ? " (directory)" : ""}`
        );
      });

      // Check if container.xml exists
      const containerFile = this.zip.file("META-INF/container.xml");
      if (!containerFile) {
        console.error(
          "EpubParser: container.xml not found in META-INF directory"
        );

        // Try to find any OPF file directly as a fallback
        const opfFile = fileKeys.find((path) => path.endsWith(".opf"));
        if (opfFile) {
          console.log("EpubParser: Found OPF file directly:", opfFile);
          this.rootfilePath = opfFile;
          this.rootfileDir = opfFile.split("/").slice(0, -1).join("/");
          if (this.rootfileDir) this.rootfileDir += "/";
          return;
        }

        throw new Error(
          "container.xml not found and could not locate OPF file"
        );
      }

      // Parse container.xml
      const containerXml = await containerFile.async("text");
      console.log(
        "EpubParser: container.xml content:",
        containerXml.substring(0, 200) + "..."
      );

      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(
        containerXml,
        "application/xml"
      );

      // Check for parsing errors
      const parserError = containerDoc.querySelector("parsererror");
      if (parserError) {
        console.error(
          "EpubParser: XML parsing error:",
          parserError.textContent
        );
        throw new Error("Failed to parse container.xml: XML parsing error");
      }

      // Find the rootfile element
      const rootfileEl = containerDoc.querySelector("rootfile");
      if (!rootfileEl) {
        console.error("EpubParser: No rootfile element found in container.xml");
        throw new Error("No rootfile element found in container.xml");
      }

      // Get the full-path attribute
      const rootfilePath = rootfileEl.getAttribute("full-path");
      if (!rootfilePath) {
        console.error("EpubParser: No full-path attribute in rootfile element");
        throw new Error("No full-path attribute in rootfile element");
      }

      this.rootfilePath = rootfilePath;
      this.rootfileDir = rootfilePath.split("/").slice(0, -1).join("/");
      if (this.rootfileDir) this.rootfileDir += "/";

      console.log("EpubParser: Found OPF file at:", rootfilePath);
    } catch (error) {
      console.error("EpubParser: Error parsing container.xml:", error);
      throw new Error("Failed to parse EPUB structure: " + error.message);
    }
  }

  /**
   * Parse the OPF file to get metadata, manifest, and spine
   * @returns {Promise<void>}
   */
  async parseOPF() {
    try {
      const opfContent = await this.zip.file(this.rootfilePath).async("text");
      const parser = new DOMParser();
      const opfDoc = parser.parseFromString(opfContent, "application/xml");

      // Parse metadata
      const metadataEl = opfDoc.querySelector("metadata");
      if (metadataEl) {
        this.metadata.title =
          this.getElementText(metadataEl, "title") || "Untitled";
        this.metadata.creator =
          this.getElementText(metadataEl, "creator") || "Unknown";
        this.metadata.language =
          this.getElementText(metadataEl, "language") || "en";
        this.metadata.publisher =
          this.getElementText(metadataEl, "publisher") || "";
        this.metadata.identifier =
          this.getElementText(metadataEl, "identifier") || "";
      }

      // Parse manifest (all items/resources in the EPUB)
      const manifestItems = opfDoc.querySelectorAll("manifest item");
      manifestItems.forEach((item) => {
        const id = item.getAttribute("id");
        const href = item.getAttribute("href");
        const mediaType = item.getAttribute("media-type");

        this.manifest[id] = {
          href: this.rootfileDir + href,
          mediaType,
        };
      });

      // Parse spine (reading order)
      const spineItems = opfDoc.querySelectorAll("spine itemref");
      spineItems.forEach((item) => {
        const idref = item.getAttribute("idref");
        if (this.manifest[idref]) {
          this.spine.push({
            idref,
            href: this.manifest[idref].href,
            mediaType: this.manifest[idref].mediaType,
          });
        }
      });

      console.log("EpubParser: Parsed OPF file successfully");
      console.log("EpubParser: Metadata:", this.metadata);
      console.log("EpubParser: Spine items:", this.spine.length);
    } catch (error) {
      console.error("EpubParser: Error parsing OPF file:", error);
      throw new Error("Failed to parse OPF file: " + error.message);
    }
  }

  /**
   * Parse the TOC (Table of Contents)
   * @returns {Promise<void>}
   */
  async parseTOC() {
    try {
      // First try to find the TOC from the manifest
      const tocItem = Object.values(this.manifest).find(
        (item) =>
          item.href.includes("toc.ncx") ||
          item.mediaType === "application/x-dtbncx+xml"
      );

      if (!tocItem) {
        console.warn("EpubParser: No TOC file found in manifest");
        return;
      }

      const tocContent = await this.zip.file(tocItem.href).async("text");
      const parser = new DOMParser();
      const tocDoc = parser.parseFromString(tocContent, "application/xml");

      // Parse navPoints (TOC entries)
      const navPoints = tocDoc.querySelectorAll("navPoint");
      const parseNavPoint = (navPoint, level = 0) => {
        const labelEl = navPoint.querySelector("navLabel text");
        const contentEl = navPoint.querySelector("content");

        if (!labelEl || !contentEl) return null;

        const label = labelEl.textContent.trim();
        const src = contentEl.getAttribute("src");
        const href = src.includes("#")
          ? this.rootfileDir + src.split("#")[0]
          : this.rootfileDir + src;

        const anchor = src.includes("#") ? src.split("#")[1] : null;

        const item = {
          label,
          href,
          anchor,
          level,
          subitems: [],
        };

        // Process child navPoints recursively
        const childNavPoints = Array.from(navPoint.children).filter(
          (el) => el.tagName === "navPoint"
        );
        childNavPoints.forEach((childNavPoint) => {
          const childItem = parseNavPoint(childNavPoint, level + 1);
          if (childItem) item.subitems.push(childItem);
        });

        return item;
      };

      navPoints.forEach((navPoint) => {
        // Only process top-level navPoints
        if (
          !navPoint.parentElement ||
          navPoint.parentElement.tagName !== "navPoint"
        ) {
          const item = parseNavPoint(navPoint);
          if (item) this.toc.push(item);
        }
      });

      console.log(
        "EpubParser: Parsed TOC successfully, entries:",
        this.toc.length
      );
    } catch (error) {
      console.error("EpubParser: Error parsing TOC:", error);
      // Don't throw, just warn - TOC is nice to have but not critical
      console.warn("EpubParser: Will proceed without TOC");
    }
  }

  /**
   * Utility to get text content of an XML element
   * @param {Element} parent - Parent element
   * @param {string} tagName - Tag name to find
   * @returns {string|null} - Text content or null if not found
   */
  getElementText(parent, tagName) {
    const el = parent.querySelector(tagName);
    return el ? el.textContent.trim() : null;
  }

  /**
   * Get content of a specific file in the EPUB
   * @param {string} href - Path to the file
   * @returns {Promise<string>} - File content as text
   */
  async getFileContent(href) {
    try {
      const file = this.zip.file(href);
      if (!file) {
        throw new Error(`File not found in EPUB: ${href}`);
      }
      return await file.async("text");
    } catch (error) {
      console.error(
        `EpubParser: Error getting file content for ${href}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get content of a specific file in the EPUB as a blob URL
   * @param {string} href - Path to the file
   * @returns {Promise<string>} - Blob URL for the file
   */
  async getFileAsUrl(href) {
    try {
      const file = this.zip.file(href);
      if (!file) {
        throw new Error(`File not found in EPUB: ${href}`);
      }

      const content = await file.async("blob");
      const mediaType = this.getMediaType(href);
      const contentWithType = new Blob([content], { type: mediaType });
      return URL.createObjectURL(contentWithType);
    } catch (error) {
      console.error(`EpubParser: Error getting blob URL for ${href}:`, error);
      throw error;
    }
  }

  /**
   * Try to determine media type from file extension
   * @param {string} href - File path
   * @returns {string} - Media type
   */
  getMediaType(href) {
    const extension = href.split(".").pop().toLowerCase();
    const mediaTypes = {
      html: "text/html",
      htm: "text/html",
      xhtml: "application/xhtml+xml",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      css: "text/css",
      js: "text/javascript",
    };

    return mediaTypes[extension] || "application/octet-stream";
  }

  /**
   * Get the current chapter content
   * @param {Object} options - Options for content processing
   * @param {boolean} options.numberParagraphs - Whether to number paragraphs
   * @returns {Promise<Object>} - Chapter content and metadata
   */
  async getCurrentChapter(options = {}) {
    if (
      this.currentSpineIndex < 0 ||
      this.currentSpineIndex >= this.spine.length
    ) {
      throw new Error("Invalid spine index");
    }

    const spineItem = this.spine[this.currentSpineIndex];
    const content = await this.getFileContent(spineItem.href);

    // Process HTML content to fix relative URLs and apply options
    const processedContent = this.processHtml(content, spineItem.href, options);

    return {
      index: this.currentSpineIndex,
      href: spineItem.href,
      content: processedContent,
      total: this.spine.length,
    };
  }

  /**
   * Process HTML content to fix relative URLs and styling issues
   * @param {string} html - HTML content
   * @param {string} baseHref - Base href for relative URLs
   * @param {Object} options - Processing options
   * @param {boolean} options.numberParagraphs - Whether to number paragraphs
   * @returns {string} - Processed HTML
   */
  processHtml(html, baseHref, options = {}) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const baseDir = baseHref.split("/").slice(0, -1).join("/");

    // Fix image URLs
    const images = doc.querySelectorAll("img");
    images.forEach((img) => {
      const src = img.getAttribute("src");
      if (src && !src.startsWith("http") && !src.startsWith("data:")) {
        // Save the original src to a data attribute so we can retrieve it later
        img.setAttribute("data-original-src", src);

        // For now, set a placeholder - we'll load the actual images when rendering
        img.setAttribute(
          "src",
          "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20fill%3D%22%23999%22%3EImage%3C%2Ftext%3E%3C%2Fsvg%3E"
        );
      }
    });

    // Fix CSS URLs
    const links = doc.querySelectorAll('link[rel="stylesheet"]');
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href && !href.startsWith("http")) {
        // Save the original href
        link.setAttribute("data-original-href", href);

        // Remove the href attribute - we'll handle CSS manually
        link.removeAttribute("href");
      }
    });

    // Remove inline styles that might cause text to appear as links
    const allElements = doc.querySelectorAll("*");
    allElements.forEach((el) => {
      // Handle inline styles that might color text or add underlines
      if (el.style) {
        if (el.tagName.toLowerCase() !== "a") {
          // Remove color and text-decoration properties on non-link elements
          el.style.color = "";
          el.style.textDecoration = "";
        }
      }

      // Remove any classes that might be causing link-like appearance
      if (el.classList) {
        // This is a bit aggressive, but we can't easily know which classes add link styles
        // Better to clear and use our own styling
        const keepClasses = [
          "chapter",
          "section",
          "title",
          "heading",
          "paragraph",
        ];
        const classesToKeep = Array.from(el.classList).filter((cls) =>
          keepClasses.some((keep) => cls.includes(keep))
        );

        el.className = classesToKeep.join(" ");
      }
    });

    // Add paragraph numbering if requested
    if (options.numberParagraphs) {
      // First add a style element with proper positioning CSS
      const numberingStyle = doc.createElement("style");
      numberingStyle.textContent = `
    p.numbered-paragraph {
      position: relative;
      padding-left: 2.5em;
    }
    .paragraph-number {
      position: absolute;
      left: 0;
      top: 0;
      width: 2em;
      text-align: right;
      color: gray !important;
      font-size: 0.85em;
      user-select: none;
    }
  `;
      const head = doc.querySelector("head");
      if (head) {
        head.appendChild(numberingStyle);
      } else {
        // If no head, create one
        const newHead = doc.createElement("head");
        newHead.appendChild(numberingStyle);
        doc.documentElement.insertBefore(
          newHead,
          doc.documentElement.firstChild
        );
      }

      const paragraphs = doc.querySelectorAll("p");
      paragraphs.forEach((p, index) => {
        // Skip very short paragraphs (likely not actual content paragraphs)
        if (p.textContent.trim().length < 10) return;

        // Add positioning class to the paragraph
        p.classList.add("numbered-paragraph");

        // Create the paragraph number element
        const numberSpan = doc.createElement("span");
        numberSpan.className = "paragraph-number";
        numberSpan.textContent = `${index + 1}`;

        // Insert at the beginning of the paragraph
        p.insertBefore(numberSpan, p.firstChild);
      });
    }

    // Add a style element to normalize text appearance
    const styleEl = doc.createElement("style");
    styleEl.textContent = `
      * { color: inherit !important; text-decoration: none !important; }
      p { margin-bottom: 1em; }
      h1, h2, h3, h4, h5, h6 { margin-top: 1em; margin-bottom: 0.5em; }
      a:hover { text-decoration: none !important; }
      .paragraph-number { opacity: 0.7; }
    `;
    doc.head.appendChild(styleEl);

    return doc.documentElement.outerHTML;
  }

  /**
   * Navigate to a specific chapter by index
   * @param {number} index - Chapter index in the spine
   * @param {Object} options - Options for content processing
   * @param {boolean} options.numberParagraphs - Whether to number paragraphs
   * @returns {Promise<Object>} - Chapter content and metadata
   */
  async goToChapter(index, options = {}) {
    if (index < 0) index = 0;
    if (index >= this.spine.length) index = this.spine.length - 1;

    this.currentSpineIndex = index;
    return await this.getCurrentChapter(options);
  }

  /**
   * Navigate to the next chapter
   * @returns {Promise<Object>} - Chapter content and metadata
   */
  async nextChapter() {
    return await this.goToChapter(this.currentSpineIndex + 1);
  }

  /**
   * Navigate to the previous chapter
   * @returns {Promise<Object>} - Chapter content and metadata
   */
  async prevChapter() {
    return await this.goToChapter(this.currentSpineIndex - 1);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Clean up any resources if needed
    // We're no longer using blob URLs directly, so no need to revoke them
    this.zip = null;
    console.log("EpubParser: Resources cleaned up");
  }

  /**
   * Extract cover image from EPUB file
   * @returns {Promise<string>} Base64 encoded cover image or null if not found
   */
  async extractCoverImage() {
    try {
      // First try: Look for a cover image specified in the manifest
      if (this.manifest) {
        // Look for item with ID containing 'cover' or properties containing 'cover-image'
        const coverItem = Object.values(this.manifest).find(
          (item) =>
            (item.id && item.id.toLowerCase().includes("cover")) ||
            (item.properties && item.properties.includes("cover-image"))
        );

        if (coverItem && coverItem.href) {
          this.coverPath = coverItem.href;
          console.log("Found cover image in manifest:", this.coverPath);
          return await this.getResourceAsBase64(this.coverPath);
        }
      }

      // Second try: Look for an item in the spine with 'cover' in the ID or href
      for (const item of this.spine) {
        if (
          (item.id && item.id.toLowerCase().includes("cover")) ||
          (item.href && item.href.toLowerCase().includes("cover"))
        ) {
          this.coverPath = item.href;
          console.log("Found cover in spine:", this.coverPath);
          return await this.getResourceAsBase64(this.coverPath);
        }
      }

      // Third try: Just use the first image file we can find
      if (this.manifest) {
        const firstImage = Object.values(this.manifest).find(
          (item) => item.mediaType && item.mediaType.startsWith("image/")
        );

        if (firstImage && firstImage.href) {
          this.coverPath = firstImage.href;
          console.log("Using first image as cover:", this.coverPath);
          return await this.getResourceAsBase64(this.coverPath);
        }
      }

      console.log("No cover image found in EPUB");
      return null;
    } catch (error) {
      console.error("Error extracting cover image:", error);
      return null;
    }
  }

  /**
   * Get a resource as a base64 encoded data URL
   * @param {string} path - Path to the resource
   * @returns {Promise<string>} Base64 encoded data URL
   */
  async getResourceAsBase64(path) {
    try {
      // Get the absolute path to the resource
      const absolutePath = this.getAbsolutePath(path);

      // Get the file from the zip
      const file = await this.zip.file(absolutePath).async("blob");
      if (!file) {
        throw new Error(`Resource not found: ${absolutePath}`);
      }

      // Get the media type
      const mediaType = this.getMediaType(absolutePath) || "image/jpeg";

      // Convert to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error("Error getting resource as base64:", error);
      return null;
    }
  }

  /**
   * Get the media type for a file based on its extension
   * @param {string} path - Path to the file
   * @returns {string} Media type or null if unknown
   */
  getMediaType(path) {
    const extension = path.split(".").pop().toLowerCase();
    const mediaTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
    };

    return mediaTypes[extension] || null;
  }

  /**
   * Get the absolute path for a resource
   * @param {string} path - Path to the resource
   * @returns {string} Absolute path
   */
  getAbsolutePath(path) {
    if (path.startsWith("/")) {
      return path;
    }

    if (this.rootfileDir) {
      return this.rootfileDir + path;
    }

    return path;
  }
}

export default EpubParser;

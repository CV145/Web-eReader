/**
 * File Utilities
 * Helper functions for file operations
 */

/**
 * Creates a download link element for a file
 * @param {string} url - URL of the file to download
 * @param {string} filename - Filename to use for the download
 * @returns {HTMLElement} - Download link element
 */
export function createDownloadLink(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.className = "download-link";
  link.textContent = `Download ${filename}`;
  link.style.display = "inline-block";
  link.style.padding = "10px 15px";
  link.style.backgroundColor = "#4CAF50";
  link.style.color = "white";
  link.style.textDecoration = "none";
  link.style.borderRadius = "5px";
  link.style.margin = "15px 0";
  
  link.addEventListener("mouseover", () => {
    link.style.backgroundColor = "#45a049";
  });
  
  link.addEventListener("mouseout", () => {
    link.style.backgroundColor = "#4CAF50";
  });
  
  return link;
}

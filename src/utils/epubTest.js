/**
 * EPUB Test Utility
 * A simple utility to test EPUB extraction without relying on JSZip or other libraries
 */

// Function to test if a file is a valid EPUB by checking basic ZIP structure
export async function testEpubFile(url) {
  console.log('EpubTest: Starting test for:', url);
  
  try {
    // Fetch the file
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`EpubTest: HTTP error! status: ${response.status}`);
      return { success: false, error: `HTTP error! status: ${response.status}` };
    }
    
    // Get the file as an ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    console.log(`EpubTest: File fetched successfully, size: ${arrayBuffer.byteLength} bytes`);
    
    // Check if it's empty
    if (arrayBuffer.byteLength === 0) {
      console.error('EpubTest: File is empty (0 bytes)');
      return { success: false, error: 'File is empty' };
    }
    
    // Create a DataView to access the binary data
    const view = new DataView(arrayBuffer);
    
    // Check for ZIP file signature (first 4 bytes should be 0x50 0x4B 0x03 0x04)
    const signature = view.getUint32(0, true); // true for little-endian
    const isZipSignature = signature === 0x04034b50;
    
    console.log(`EpubTest: File signature: 0x${signature.toString(16).padStart(8, '0')}`);
    console.log(`EpubTest: Is ZIP signature: ${isZipSignature}`);
    
    if (!isZipSignature) {
      return { 
        success: false, 
        error: 'Not a valid ZIP file (incorrect signature)',
        details: {
          signature: `0x${signature.toString(16).padStart(8, '0')}`,
          expectedSignature: '0x04034b50'
        }
      };
    }
    
    // Try to find the End of Central Directory record
    // It should be near the end of the file and starts with the signature 0x06054b50
    const bytes = new Uint8Array(arrayBuffer);
    let endOfCentralDirFound = false;
    
    // Search for the signature starting from the end
    // The signature is 0x50 0x4B 0x05 0x06 in little-endian
    for (let i = bytes.length - 22; i >= 0; i--) {
      if (
        bytes[i] === 0x50 && 
        bytes[i + 1] === 0x4B && 
        bytes[i + 2] === 0x05 && 
        bytes[i + 3] === 0x06
      ) {
        endOfCentralDirFound = true;
        console.log(`EpubTest: End of Central Directory found at offset: ${i}`);
        break;
      }
    }
    
    if (!endOfCentralDirFound) {
      return { 
        success: false, 
        error: 'End of Central Directory signature not found',
        details: {
          fileSize: arrayBuffer.byteLength,
          note: 'This may not be a valid ZIP file or it might be corrupted'
        }
      };
    }
    
    return { 
      success: true, 
      message: 'File appears to be a valid ZIP/EPUB file',
      details: {
        size: arrayBuffer.byteLength,
        zipSignatureValid: true,
        endOfCentralDirFound: true
      }
    };
    
  } catch (error) {
    console.error('EpubTest: Error testing EPUB file:', error);
    return { success: false, error: error.message };
  }
}

// Export a function to download and save the EPUB file for inspection
export function createDownloadLink(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'book.epub';
  link.textContent = `Download ${filename || 'EPUB'}`;
  link.style.display = 'block';
  link.style.margin = '10px 0';
  link.style.padding = '5px 10px';
  link.style.backgroundColor = '#4CAF50';
  link.style.color = 'white';
  link.style.textDecoration = 'none';
  link.style.textAlign = 'center';
  link.style.borderRadius = '4px';
  
  return link;
}

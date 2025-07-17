// ImageProcessingService.js
// Handles HEIC conversion and image resizing in the frontend

class ImageProcessingService {
  constructor() {
    this.heic2any = null;
    this.isHeicLibraryLoaded = false;
  }

  // Dynamically load heic2any library
  async loadHeicLibrary() {
    if (this.isHeicLibraryLoaded && this.heic2any) {
      return this.heic2any;
    }

    try {
      // Load heic2any from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          if (window.heic2any) {
            this.heic2any = window.heic2any;
            this.isHeicLibraryLoaded = true;
            console.log('HEIC library loaded successfully');
            resolve(this.heic2any);
          } else {
            reject(new Error('HEIC library failed to load'));
          }
        };
        
        script.onerror = () => {
          reject(new Error('Failed to load HEIC library from CDN'));
        };
        
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Error loading HEIC library:', error);
      throw error;
    }
  }

  // Check if file is HEIC format
  isHeicFile(file) {
    const heicExtensions = ['.heic', '.heif', '.HEIC', '.HEIF'];
    const heicMimeTypes = ['image/heic', 'image/heif'];
    
    const hasHeicExtension = heicExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext.toLowerCase())
    );
    
    const hasHeicMimeType = heicMimeTypes.includes(file.type.toLowerCase());
    
    return hasHeicExtension || hasHeicMimeType;
  }

  // Convert HEIC to JPEG
  async convertHeicToJpeg(file) {
    try {
      console.log('Converting HEIC file:', file.name);
      
      // Load HEIC library if not already loaded
      await this.loadHeicLibrary();
      
      if (!this.heic2any) {
        throw new Error('HEIC conversion library not available');
      }

      // Convert HEIC to JPEG blob
      const convertedBlob = await this.heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9
      });

      // Create new File object from converted blob
      const convertedFile = new File(
        [convertedBlob], 
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { 
          type: 'image/jpeg',
          lastModified: Date.now()
        }
      );

      console.log('HEIC conversion completed:', convertedFile.name);
      return convertedFile;
      
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error(`HEIC conversion failed: ${error.message}`);
    }
  }

  // Resize image to maximum 1080px while maintaining aspect ratio
  async resizeImage(file, maxSize = 1080) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
          try {
            // Calculate new dimensions maintaining aspect ratio
            const { width: newWidth, height: newHeight } = this.calculateResizeDimensions(
              img.width, 
              img.height, 
              maxSize
            );

            // Set canvas dimensions
            canvas.width = newWidth;
            canvas.height = newHeight;

            // Draw resized image
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Convert to blob
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Failed to create resized image blob'));
                return;
              }

              // Create new File object
              const resizedFile = new File(
                [blob],
                file.name,
                {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                }
              );

              console.log(`Image resized: ${img.width}x${img.height} → ${newWidth}x${newHeight}`);
              resolve(resizedFile);
            }, 'image/jpeg', 0.9);

          } catch (error) {
            reject(new Error(`Resize processing failed: ${error.message}`));
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for resizing'));
        };

        // Load image from file
        img.src = URL.createObjectURL(file);

      } catch (error) {
        reject(new Error(`Resize setup failed: ${error.message}`));
      }
    });
  }

  // Calculate new dimensions maintaining aspect ratio
  calculateResizeDimensions(originalWidth, originalHeight, maxSize) {
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    // Only resize if image is larger than maxSize
    if (originalWidth > maxSize || originalHeight > maxSize) {
      const aspectRatio = originalWidth / originalHeight;

      if (originalWidth > originalHeight) {
        // Landscape: limit width
        newWidth = maxSize;
        newHeight = Math.round(maxSize / aspectRatio);
      } else {
        // Portrait: limit height
        newHeight = maxSize;
        newWidth = Math.round(maxSize * aspectRatio);
      }
    }

    return { width: newWidth, height: newHeight };
  }

  // Create preview URL for display
  createPreviewUrl(file) {
    return URL.createObjectURL(file);
  }

  // Clean up preview URL to prevent memory leaks
  revokePreviewUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  // Main processing function: handles both HEIC conversion and resizing
  async processImageFile(file, options = {}) {
    const { 
      maxSize = 1080, 
      onProgress = () => {}, 
      enableResize = false,
      enableHeicConversion = true 
    } = options;

    try {
      let processedFile = file;
      
      onProgress({ step: 'starting', message: 'Processing image...', progress: 0 });

      // Step 1: Convert HEIC if needed
      if (enableHeicConversion && this.isHeicFile(file)) {
        onProgress({ step: 'converting', message: 'Converting HEIC to JPEG...', progress: 25 });
        processedFile = await this.convertHeicToJpeg(file);
      }

      // Step 2: Resize image if needed
      if (enableResize) {
        onProgress({ step: 'resizing', message: 'Resizing image...', progress: 50 });
        processedFile = await this.resizeImage(processedFile, maxSize);
      }

      // Step 3: Create preview URL
      onProgress({ step: 'preview', message: 'Creating preview...', progress: 75 });
      const previewUrl = this.createPreviewUrl(processedFile);

      onProgress({ step: 'complete', message: 'Processing complete!', progress: 100 });

      return {
        file: processedFile,
        previewUrl: previewUrl,
        originalFile: file,
        wasConverted: this.isHeicFile(file),
        wasResized: enableResize,
        originalSize: `${file.size} bytes`,
        processedSize: `${processedFile.size} bytes`,
        compressionRatio: ((file.size - processedFile.size) / file.size * 100).toFixed(1)
      };

    } catch (error) {
      onProgress({ step: 'error', message: error.message, progress: 0 });
      throw error;
    }
  }

  // Validate file before processing
  validateImageFile(file) {
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif'
    ];
    
    const validExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'
    ];

    const hasValidType = validTypes.includes(file.type.toLowerCase());
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext.toLowerCase())
    );

    if (!hasValidType && !hasValidExtension) {
      throw new Error('Invalid file type. Please upload an image file (JPG, PNG, GIF, WebP, HEIC).');
    }

    // Check file size (50MB limit)
    const maxFileSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxFileSize) {
      throw new Error('File size too large. Please upload an image smaller than 50MB.');
    }

    return true;
  }

  // Get file info
  getFileInfo(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified),
      isHeic: this.isHeicFile(file),
      sizeFormatted: this.formatFileSize(file.size)
    };
  }

  // Format file size in human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
const imageProcessingService = new ImageProcessingService();
export default imageProcessingService;
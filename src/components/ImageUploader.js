import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Form, ProgressBar, Alert } from 'react-bootstrap';
// Import heic2any for HEIC conversion
import heic2any from 'heic2any';

// API base URL - centralize it here
const API_BASE_URL = "https://receiptscannerbackend.onrender.com/api";

const ImageUploader = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  // Enhanced format detection - checks if file needs conversion
  const needsConversion = (file) => {
    if (!file) return false;
    
    // HEIC/HEIF files (iOS devices)
    const isHeicHeif = file.type === 'image/heic' || 
                       file.type === 'image/heif' || 
                       file.name.toLowerCase().endsWith('.heic') || 
                       file.name.toLowerCase().endsWith('.heif');
    
    // Other formats not directly supported by OpenAI
    const needsJpegConversion = file.type === 'image/bmp' ||
                               file.type === 'image/tiff' ||
                               file.type === 'image/svg+xml' ||
                               file.name.toLowerCase().endsWith('.bmp') ||
                               file.name.toLowerCase().endsWith('.tiff') ||
                               file.name.toLowerCase().endsWith('.tif') ||
                               file.name.toLowerCase().endsWith('.svg');
    
    return isHeicHeif || needsJpegConversion;
  };

  // Canvas-based conversion for non-HEIC formats
  const convertToJpeg = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Set canvas size to image size (maintain original dimensions)
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Convert to JPEG blob with high quality
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to JPEG'));
          }
        }, 'image/jpeg', 0.92); // High quality for better OCR
      };
      
      img.onerror = () => reject(new Error('Failed to load image for conversion'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Enhanced file processing with multi-format support
  const processFile = async (selectedFile) => {
    if (!selectedFile) return null;

    let fileToUse = selectedFile;
    let conversionMessage = '';

    if (needsConversion(selectedFile)) {
      const originalFormat = selectedFile.type || `${selectedFile.name.split('.').pop()?.toUpperCase() || 'Unknown'}`;
      conversionMessage = `Converting ${originalFormat} to JPEG for optimal processing...`;
      setWarning(conversionMessage);
      
      try {
        let blob;
        
        // Handle HEIC/HEIF files with heic2any
        if (selectedFile.type === 'image/heic' || selectedFile.type === 'image/heif' || 
            selectedFile.name.toLowerCase().endsWith('.heic') || 
            selectedFile.name.toLowerCase().endsWith('.heif')) {
          
          blob = await heic2any({
            blob: selectedFile,
            toType: "image/jpeg",
            quality: 0.92 // High quality for better OCR
          });
        } 
        // Handle other formats with canvas conversion
        else {
          blob = await convertToJpeg(selectedFile);
        }
        
        // Create new file with converted blob
        const originalName = selectedFile.name;
        const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
        
        fileToUse = new File([blob], `${baseName}.jpg`, { 
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        setWarning(`✅ File converted to JPEG successfully! Original: ${(selectedFile.size / 1024).toFixed(1)}KB → Optimized: ${(fileToUse.size / 1024).toFixed(1)}KB`);
        
      } catch (err) {
        console.error("File conversion error:", err);
        setError(`Failed to convert ${originalFormat} file. Please try converting to JPEG manually or use a different image.`);
        return null;
      }
    }

    return fileToUse;
  };

  // Updated handleFileChange with enhanced processing
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Reset states
    setError('');
    setWarning('');
    setPreview('');
    
    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size too large. Please select an image under 10MB.');
      return;
    }
    
    // Process the file
    const processedFile = await processFile(selectedFile);
    if (!processedFile) return; // Error occurred during processing
    
    setFile(processedFile);
    
    // Create preview
    try {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.onerror = () => {
        setWarning(prev => prev + "\nNote: Unable to preview this file type, but upload should still work.");
        setPreview('');
      };
      reader.readAsDataURL(processedFile);
    } catch (err) {
      console.error("Preview error:", err);
      setWarning(prev => prev + "\nNote: Unable to create preview, but upload should still work.");
    }
  };

  // Updated handleDrop with enhanced processing
  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    
    // Reset states
    setError('');
    setWarning('');
    setPreview('');
    
    // Validate file size
    if (droppedFile.size > 10 * 1024 * 1024) {
      setError('File size too large. Please select an image under 10MB.');
      return;
    }
    
    // Process the file
    const processedFile = await processFile(droppedFile);
    if (!processedFile) return;
    
    setFile(processedFile);
    
    // Create preview
    try {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.onerror = () => {
        setWarning(prev => prev + "\nNote: Unable to preview this file type, but upload should still work.");
        setPreview('');
      };
      reader.readAsDataURL(processedFile);
    } catch (err) {
      console.error("Preview error:", err);
      setWarning(prev => prev + "\nNote: Unable to create preview, but upload should still work.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setError('');
    
    const formData = new FormData();
    
    // Add verbose logging for debugging
    console.log("Attempting to upload file:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileSizeKB: (file.size / 1024).toFixed(2) + 'KB'
    });
    
    try {
      formData.append('file', file);
      
      console.log("FormData created successfully, starting upload...");
      
      const response = await axios.post(`${API_BASE_URL}/receipt/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
        timeout: 120000 // 2 minutes timeout for large files and processing
      });
      
      setUploading(false);
      console.log("Upload successful:", response.data);
      
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      setUploading(false);
      console.error('Upload error details:', err);
      
      // Enhanced error messages
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message || err.response.data || 'Unknown error';
        
        if (status === 413) {
          setError('File size too large. Please compress your image or try a smaller file.');
        } else if (status === 415) {
          setError('Unsupported file format. Please try converting to JPEG or PNG.');
        } else if (status >= 500) {
          setError(`Server error (${status}). Please try again in a moment.`);
        } else {
          setError(`Upload failed (${status}): ${message}`);
        }
      } else if (err.request) {
        setError('No response from server. Please check your internet connection and try again.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Upload timeout. The file might be too large or processing is taking too long.');
      } else {
        setError(`Upload error: ${err.message}`);
      }
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>Upload Receipt Image</Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {warning && <Alert variant="warning" style={{ whiteSpace: 'pre-line' }}>{warning}</Alert>}
        
        <div 
          className="drop-area mb-3 p-5 border rounded text-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ cursor: 'pointer', backgroundColor: '#f8f9fa' }}
        >
          <p>Drag & drop your receipt image here or click to browse</p>
          <p className="text-muted">
            Supported formats: JPEG, PNG, GIF, WebP, BMP, TIFF, HEIC, HEIF
            <br />
            <small>All formats will be optimized for processing • Max 10MB</small>
          </p>
          <Form.Control 
            type="file" 
            accept="image/*,.heic,.heif,.bmp,.tiff,.tif"
            onChange={handleFileChange} 
            style={{ display: 'none' }}
            id="fileInput"
          />
          <Button 
            variant="outline-primary"
            onClick={() => document.getElementById('fileInput').click()}
          >
            Browse Files
          </Button>
        </div>
        
        {file && (
          <div className="mb-3">
            <p>
              <strong>Selected file:</strong> {file.name} 
              <span className="text-muted"> ({(file.size / 1024).toFixed(2)} KB)</span>
            </p>
          </div>
        )}
        
        {preview && (
          <div className="text-center mb-3">
            <h6>Preview:</h6>
            <img 
              src={preview} 
              alt="Receipt preview" 
              style={{ maxWidth: '100%', maxHeight: '300px' }}
              className="border rounded"
            />
          </div>
        )}
        
        {uploading && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>Processing receipt...</span>
              <span>{uploadProgress}%</span>
            </div>
            <ProgressBar now={uploadProgress} />
            {uploadProgress < 100 && (
              <small className="text-muted mt-1 d-block">
                {uploadProgress < 50 ? 'Uploading image...' : 'Processing with AI...'}
              </small>
            )}
          </div>
        )}
        
        <Button 
          variant="primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          size="lg"
          className="w-100"
        >
          {uploading ? 'Processing Receipt...' : 'Process Receipt'}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default ImageUploader;
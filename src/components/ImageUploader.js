import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Alert, ProgressBar, Spinner, Form, Badge } from 'react-bootstrap';
import axios from 'axios';
import imageProcessingService from '../services/ImageProcessingService';

const ImageUploader = ({ onUploadSuccess, isAuthenticated = false }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const [processedFileInfo, setProcessedFileInfo] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        imageProcessingService.revokePreviewUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    await processSelectedFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    await processSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const processSelectedFile = async (file) => {
    try {
      // Reset states
      setUploadStatus(null);
      setError('');
      setProcessingProgress(0);
      setProcessingMessage('');
      setIsProcessing(true);
      setUploadProgress(0);

      // Clean up previous preview
      if (previewUrl) {
        imageProcessingService.revokePreviewUrl(previewUrl);
        setPreviewUrl(null);
      }

      // Validate file size (max 50MB for processing, but will be compressed)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size too large. Please select an image under 50MB.');
        setIsProcessing(false);
        return;
      }

      // Validate file
      imageProcessingService.validateImageFile(file);

      console.log('[PROCESSING] Starting image processing:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileSizeKB: (file.size / 1024).toFixed(2) + 'KB'
      });

      // Get original file info
      const originalFileInfo = imageProcessingService.getFileInfo(file);
      setFileInfo(originalFileInfo);

      // Process the image (HEIC conversion + resizing)
      const result = await imageProcessingService.processImageFile(file, {
        maxSize: 1080,
        onProgress: (progress) => {
          setProcessingProgress(progress.progress);
          setProcessingMessage(progress.message);
        }
      });

      // Set processed file and preview
      setSelectedFile(result.file);
      setPreviewUrl(result.previewUrl);
      setProcessedFileInfo(result);
      
      setIsProcessing(false);
      console.log('[PROCESSING] Image processing completed:', {
        originalSize: file.size,
        processedSize: result.file.size,
        compressionRatio: result.compressionRatio,
        wasConverted: result.wasConverted,
        wasResized: result.wasResized
      });

    } catch (error) {
      console.error('File processing error:', error);
      setIsProcessing(false);
      setError(error.message || 'Failed to process image. Please try again.');
      setSelectedFile(null);
      setFileInfo(null);
      setProcessedFileInfo(null);
    }
  };

  const handleUpload = async () => {
    // Block any processing if user is not authenticated
    if (!isAuthenticated) {
      console.log('[UPLOAD] User not authenticated, blocking upload');
      setError('Please sign in to process receipts');
      return;
    }

    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setError('');
      setUploadStatus(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log('[UPLOAD] Attempting to upload processed file:', {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        fileSizeKB: (selectedFile.size / 1024).toFixed(2) + 'KB',
        isAuthenticated,
      });

      // Prepare headers - only authorization needed
      const headers = {};

      const response = await axios.post(
        `${REACT_APP_API_BASE_URL}/receipt/upload`,
        formData,
        {
          headers,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
            console.log('[UPLOAD] Progress:', percentCompleted + '%');
          },
          timeout: 120000 // 2 minutes timeout for large files and processing
        }
      );

      setUploading(false);
      console.log('[UPLOAD] Upload successful:', response.data);

      // Add metadata about the upload
      const uploadResult = {
        ...response.data,
        isAuthenticated: true,
        uploadTimestamp: Date.now(),
        source: 'authenticated'
      };

      setUploadStatus({
        type: 'success',
        message: 'Receipt uploaded and processed successfully!'
      });

      // Clean up
      handleClear();

      // Notify parent component
      if (onUploadSuccess) {
        onUploadSuccess(uploadResult);
      }

    } catch (err) {
      setUploading(false);
      setUploadProgress(0);
      console.error('[UPLOAD] Upload error details:', err);

      // Enhanced error messages
      let errorMessage = 'Upload failed. Please try again.';
      
      if (err.response) {
        const status = err.response.status;
        const message = err.response.data?.message || err.response.data || 'Unknown error';
        
        if (status === 401) {
          errorMessage = 'Authentication failed. Please sign in and try again.';
        } else if (status === 413) {
          errorMessage = 'File size too large. Please compress your image or try a smaller file.';
        } else if (status === 415) {
          errorMessage = 'Unsupported file format. Please try converting to JPEG or PNG.';
        } else if (status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (status >= 500) {
          errorMessage = `Server error (${status}). Our AI service might be temporarily unavailable. Please try again in a moment.`;
        } else {
          errorMessage = `Upload failed (${status}): ${message}`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your internet connection and try again.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Upload timeout. The file might be too large or AI processing is taking too long. Please try a smaller file.';
      } else {
        errorMessage = `Upload error: ${err.message}`;
      }

      setError(errorMessage);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      imageProcessingService.revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }
    setUploadStatus(null);
    setError('');
    setFileInfo(null);
    setProcessedFileInfo(null);
    setProcessingProgress(0);
    setProcessingMessage('');
    setUploadProgress(0);
    setUploading(false);
    setIsProcessing(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const FileInfoDisplay = ({ info, title, variant = "light" }) => (
    <div className={`p-3 mb-3 bg-${variant} rounded`}>
      <h6 className="mb-2">{title}</h6>
      <div className="small">
        <div><strong>Name:</strong> {info.name}</div>
        <div><strong>Size:</strong> {info.sizeFormatted || imageProcessingService.formatFileSize(info.file?.size || info.size)}</div>
        <div><strong>Type:</strong> {info.type || info.file?.type}</div>
        {info.isHeic !== undefined && (
          <div><strong>HEIC:</strong> {info.isHeic ? 'Yes' : 'No'}</div>
        )}
      </div>
    </div>
  );

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-gray text-black">
        <h5 className="mb-0">📄 Upload Receipt</h5>
      </Card.Header>
      <Card.Body>
        {!isAuthenticated ? (
          <Alert variant="warning">
            <div className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <div>
                <strong>Sign in required</strong>
                <br />
                <small>Please sign in with Google to process receipts with AI and save them to your account.</small>
              </div>
            </div>
          </Alert>
        ) : (
          <>
            {/* Error Messages */}
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* Status Messages */}
            {uploadStatus && (
              <Alert 
                variant={uploadStatus.type} 
                dismissible 
                onClose={() => setUploadStatus(null)}
                className="mb-4"
              >
                {uploadStatus.message}
              </Alert>
            )}

            {/* Drag & Drop Area */}
            <div 
              className="drop-area mb-3 p-5 border rounded text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              style={{ 
                cursor: 'pointer', 
                backgroundColor: '#f8f9fa',
                borderStyle: 'dashed',
                borderWidth: '2px',
                borderColor: selectedFile ? '#28a745' : '#dee2e6'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="mb-3">
                <i className="bi bi-cloud-upload" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
              </div>
              <p className="mb-2">Drag & drop your receipt image here or click to browse</p>
              <p className="text-muted mb-3">Supports JPG, PNG, GIF, WebP, HEIC formats</p>
              
              <Form.Control 
                ref={fileInputRef}
                type="file" 
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              
              <Button 
                variant="outline-primary"
                disabled={isProcessing || uploading}
              >
                <i className="bi bi-folder2-open me-2"></i>
                Browse Files
              </Button>
            </div>

            {/* Processing Progress */}
            {isProcessing && (
              <div className="mb-4">
                <div className="d-flex align-items-center mb-2">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>{processingMessage}</span>
                </div>
                <ProgressBar 
                  now={processingProgress} 
                  label={`${processingProgress}%`}
                  className="mb-2"
                />
              </div>
            )}

            {/* Selected File Info */}
            {selectedFile && !isProcessing && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                  <div>
                    <strong>Selected file:</strong> {selectedFile.name} 
                    <span className="text-muted"> ({imageProcessingService.formatFileSize(selectedFile.size)})</span>
                    <div className="mt-1">
                    </div>
                  </div>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={handleClear}
                    disabled={uploading || isProcessing}
                  >
                    <i className="bi bi-x-lg"></i>
                  </Button>
                </div>
              </div>
            )}

            {/* Image Preview */}
            {previewUrl && !isProcessing && (
              <div className="text-center mb-4">
                <h6>Preview:</h6>
                <div className="d-inline-block position-relative">
                  <img
                    src={previewUrl}
                    alt="Receipt Preview"
                    className="img-fluid rounded border shadow-sm"
                    style={{ 
                      maxHeight: '300px', 
                      maxWidth: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  {uploading && (
                    <div className="position-absolute top-50 start-50 translate-middle bg-white bg-opacity-75 rounded p-2">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Processing...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>
                    <i className="bi bi-robot me-2"></i>
                    AI processing receipt...
                  </span>
                  <span className="fw-bold">{uploadProgress}%</span>
                </div>
                <ProgressBar 
                  now={uploadProgress} 
                  variant={uploadProgress < 50 ? 'info' : uploadProgress < 90 ? 'warning' : 'success'}
                  style={{ height: '8px' }}
                />
                <div className="d-flex justify-content-between mt-1">
                  <small className="text-muted">
                    {uploadProgress < 30 ? 'Uploading image...' : 
                     uploadProgress < 70 ? 'AI analyzing receipt...' : 
                     uploadProgress < 95 ? 'Extracting data...' : 'Finalizing...'}
                  </small>
                  <small className="text-muted">
                    Saving to your account
                  </small>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="d-grid gap-2">
              <Button
                variant="primary"
                onClick={handleUpload}
                disabled={!selectedFile || isProcessing || uploading}
                size="lg"
              >
                {uploading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Processing Receipt...
                  </>
                ) : (
                  <>
                    <i className="bi bi-magic me-2"></i>
                    Process Receipt 
                  </>
                )}
              </Button>
            </div>

          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ImageUploader;
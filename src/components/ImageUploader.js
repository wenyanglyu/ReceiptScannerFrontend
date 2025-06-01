import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Form, ProgressBar, Alert } from 'react-bootstrap';

// API base URL - centralize it here
const API_BASE_URL = "https://receiptscannerbackend.onrender.com/api";

const ImageUploader = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');


 const handleFileChange = (e) => {
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
  
  setFile(selectedFile);
  
  // Create preview
  const reader = new FileReader();
  reader.onload = () => setPreview(reader.result);
  reader.onerror = () => setError('Unable to preview this file type.');
  reader.readAsDataURL(selectedFile);
};

  const handleDrop = (e) => {
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
  
  setFile(droppedFile);
  
  // Create preview
  const reader = new FileReader();
  reader.onload = () => setPreview(reader.result);
  reader.onerror = () => setError('Unable to preview this file type.');
  reader.readAsDataURL(droppedFile);
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
            All image formats supported • Max 10MB
          </p>
          <Form.Control 
            type="file" 
            accept="image/*"
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
                {uploadProgress < 50 ? 'Uploading image...' : 'Processing...'}
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
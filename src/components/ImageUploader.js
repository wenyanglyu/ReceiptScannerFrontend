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

  // Helper function to check if file is HEIC
  const isHeicFile = (file) => {
    return file && 
      (file.type === 'image/heic' || 
       file.type === 'image/heif' || 
       file.name.toLowerCase().endsWith('.heic') || 
       file.name.toLowerCase().endsWith('.heif'));
  };

  // Make handleFileChange async since we're using await inside
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    // Reset states
    setError('');
    setWarning('');
    
    let fileToUse = selectedFile;
    
    // Check if file is HEIC
    if (isHeicFile(selectedFile)) {
      setWarning("Converting HEIC file to JPEG...");
      
      try {
        const blob = await heic2any({
          blob: selectedFile,
          toType: "image/jpeg",
          quality: 0.8
        });
        
        // Create a new file from the blob
        fileToUse = new File([blob], 
          selectedFile.name.replace(/\.heic$/i, '.jpg'), 
          { type: 'image/jpeg' }
        );
        
        setFile(fileToUse);
        setWarning("HEIC file converted to JPEG successfully.");
      } catch (err) {
        console.error("HEIC conversion error:", err);
        setError("Failed to convert HEIC file. Please convert it to JPEG/PNG manually.");
        return; // Stop processing if conversion failed
      }
    } else {
      // For non-HEIC files, just use the selected file
      setFile(selectedFile);
      fileToUse = selectedFile;
    }
    
    // Create preview with the file (either original or converted)
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.onerror = () => {
        setWarning("Unable to preview this file type. The upload may still work.");
        setPreview('');
      };
      reader.readAsDataURL(fileToUse);
    } catch (err) {
      console.error("Preview error:", err);
      setWarning("Unable to preview this file type. The upload may still work.");
    }
  };

  // Make handleDrop async as well for consistency
  const handleDrop = async (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    
    // Reset states
    setError('');
    setWarning('');
    
    let fileToUse = droppedFile;
    
    // Check if file is HEIC
    if (isHeicFile(droppedFile)) {
      setWarning("Converting HEIC file to JPEG...");
      
      try {
        const blob = await heic2any({
          blob: droppedFile,
          toType: "image/jpeg",
          quality: 0.8
        });
        
        // Create a new file from the blob
        fileToUse = new File([blob], 
          droppedFile.name.replace(/\.heic$/i, '.jpg'), 
          { type: 'image/jpeg' }
        );
        
        setFile(fileToUse);
        setWarning("HEIC file converted to JPEG successfully.");
      } catch (err) {
        console.error("HEIC conversion error:", err);
        setError("Failed to convert HEIC file. Please convert it to JPEG/PNG manually.");
        return; // Stop processing if conversion failed
      }
    } else {
      // For non-HEIC files, just use the dropped file
      setFile(droppedFile);
      fileToUse = droppedFile;
    }
    
    // Create preview with the file (either original or converted)
    try {
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.onerror = () => {
        setWarning("Unable to preview this file type. The upload may still work.");
        setPreview('');
      };
      reader.readAsDataURL(fileToUse);
    } catch (err) {
      console.error("Preview error:", err);
      setWarning("Unable to preview this file type. The upload may still work.");
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
    console.log("Attempting to append file to FormData:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    });
    
    try {
      // Append the file with a try/catch to detect any issues
      formData.append('file', file);
      
      console.log("FormData created successfully, attempting upload...");
      
      const response = await axios.post(`${API_BASE_URL}/receipt/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
        // Add longer timeout for larger files
        timeout: 60000 // 60 seconds
      });
      
      setUploading(false);
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      setUploading(false);
      console.error('Error details:', err);
      
      // More detailed error messages
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setError(`Server error: ${err.response.status} - ${err.response.data || 'Unknown error'}`);
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server. The file might be too large or the server might be down.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Error uploading file: ${err.message}`);
      }
    }
  };

  return (
    <Card className="mb-4">
      <Card.Header>Upload Receipt Image</Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {warning && <Alert variant="warning">{warning}</Alert>}
        
        <div 
          className="drop-area mb-3 p-5 border rounded text-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{ cursor: 'pointer', backgroundColor: '#f8f9fa' }}
        >
          <p>Drag & drop your receipt image here or click to browse</p>
          <p className="text-muted">Supported formats: JPEG, PNG, GIF, BMP, HEIC</p>
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
            <p><strong>Selected file:</strong> {file.name} ({(file.size / 1024).toFixed(2)} KB)</p>
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
            <p>Uploading... {uploadProgress}%</p>
            <ProgressBar now={uploadProgress} label={`${uploadProgress}%`} />
          </div>
        )}
        
        <Button 
          variant="primary"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Processing...' : 'Process Receipt'}
        </Button>
      </Card.Body>
    </Card>
  );
};

export default ImageUploader;

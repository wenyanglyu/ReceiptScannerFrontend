import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Form, ProgressBar, Alert, Badge } from 'react-bootstrap';

// API base URL - centralize it here
const REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ImageUploader = ({ 
 onUploadSuccess, 
 isAuthenticated = false,
 userToken = null
}) => {
 const [file, setFile] = useState(null);
 const [preview, setPreview] = useState('');
 const [uploading, setUploading] = useState(false);
 const [uploadProgress, setUploadProgress] = useState(0);
 const [error, setError] = useState('');

 const handleFileChange = (e) => {
   const selectedFile = e.target.files[0];
   if (!selectedFile) return;
   
   // Reset states
   setError('');
   setPreview('');
   
   // Validate file size (max 10MB)
   if (selectedFile.size > 10 * 1024 * 1024) {
     setError('File size too large. Please select an image under 10MB.');
     return;
   }
   
   // Validate file type
   if (!selectedFile.type.startsWith('image/')) {
     setError('Please select a valid image file (JPEG, PNG, etc.).');
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
   setPreview('');
   
   // Validate file size
   if (droppedFile.size > 10 * 1024 * 1024) {
     setError('File size too large. Please select an image under 10MB.');
     return;
   }
   
   // Validate file type
   if (!droppedFile.type.startsWith('image/')) {
     setError('Please select a valid image file (JPEG, PNG, etc.).');
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

 const handleProcessReceipt = async () => {
   // Block any processing if user is not authenticated
   if (!isAuthenticated || !userToken) {
     console.log('[UPLOAD] User not authenticated, blocking upload');
     setError('Please sign in to process receipts');
     return;
   }

   if (!file) {
     setError('Please select a file to upload');
     return;
   }
   
   setUploading(true);
   setUploadProgress(0);
   setError('');
   
   const formData = new FormData();
   
   console.log('[UPLOAD] Attempting to upload file:', {
     fileName: file.name,
     fileType: file.type,
     fileSize: file.size,
     fileSizeKB: (file.size / 1024).toFixed(2) + 'KB',
     isAuthenticated,
     hasToken: !!userToken
   });
   
   try {
     formData.append('file', file);
     
     console.log('[UPLOAD] FormData created successfully, starting upload...');
     
     // Prepare headers - only authorization needed
     const headers = {
       'Authorization': `Bearer ${userToken}`
     };
     
     const response = await axios.post(`${REACT_APP_API_BASE_URL}/receipt/upload`, formData, {
       headers,
       onUploadProgress: (progressEvent) => {
         const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
         setUploadProgress(percentCompleted);
         console.log('[UPLOAD] Progress:', percentCompleted + '%');
       },
       timeout: 120000 // 2 minutes timeout for large files and processing
     });
     
     setUploading(false);
     console.log('[UPLOAD] Upload successful:', response.data);
     
     // Add metadata about the upload
     const uploadResult = {
       ...response.data,
       isAuthenticated: true,
       uploadTimestamp: Date.now(),
       source: 'authenticated'
     };
     
     if (onUploadSuccess) {
       onUploadSuccess(uploadResult);
     }
     
     // Reset form
     setFile(null);
     setPreview('');
     setUploadProgress(0);
     
     // Clear file input
     const fileInput = document.getElementById('fileInput');
     if (fileInput) {
       fileInput.value = '';
     }
     
   } catch (err) {
     setUploading(false);
     setUploadProgress(0);
     console.error('[UPLOAD] Upload error details:', err);
     
     // Enhanced error messages
     if (err.response) {
       const status = err.response.status;
       const message = err.response.data?.message || err.response.data || 'Unknown error';
       
       if (status === 401) {
         setError('Authentication failed. Please sign in and try again.');
       } else if (status === 413) {
         setError('File size too large. Please compress your image or try a smaller file.');
       } else if (status === 415) {
         setError('Unsupported file format. Please try converting to JPEG or PNG.');
       } else if (status === 429) {
         setError('Too many requests. Please wait a moment and try again.');
       } else if (status >= 500) {
         setError(`Server error (${status}). Our AI service might be temporarily unavailable. Please try again in a moment.`);
       } else {
         setError(`Upload failed (${status}): ${message}`);
       }
     } else if (err.request) {
       setError('No response from server. Please check your internet connection and try again.');
     } else if (err.code === 'ECONNABORTED') {
       setError('Upload timeout. The file might be too large or AI processing is taking too long. Please try a smaller file.');
     } else {
       setError(`Upload error: ${err.message}`);
     }
   }
 };

 // Clear form
 const handleClear = () => {
   setFile(null);
   setPreview('');
   setError('');
   setUploadProgress(0);
   
   const fileInput = document.getElementById('fileInput');
   if (fileInput) {
     fileInput.value = '';
   }
 };

 return (
   <Card className="mb-4">
     <Card.Header className="d-flex justify-content-between align-items-center">
       <span>Upload Receipt Image</span>
       {isAuthenticated && (
         <Badge bg="success">Signed In</Badge>
       )}
     </Card.Header>
     <Card.Body>
       {error && <Alert variant="danger">{error}</Alert>}
       
       <div 
         className="drop-area mb-3 p-5 border rounded text-center"
         onDrop={handleDrop}
         onDragOver={handleDragOver}
         style={{ 
           cursor: 'pointer', 
           backgroundColor: '#f8f9fa',
           borderStyle: 'dashed',
           borderWidth: '2px',
           borderColor: file ? '#28a745' : '#dee2e6'
         }}
       >
         <div className="mb-3">
           <i className="bi bi-cloud-upload" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
         </div>
         <p className="mb-2">Drag & drop your receipt image here or click to browse</p>
         <p className="text-muted mb-3">

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
           disabled={uploading}
         >
           <i className="bi bi-folder2-open me-2"></i>
           Browse Files
         </Button>
       </div>
       
       {file && (
         <div className="mb-3">
           <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
             <div>
               <strong>Selected file:</strong> {file.name} 
               <span className="text-muted"> ({(file.size / 1024).toFixed(2)} KB)</span>
               <div className="mt-1">
                 <small className="text-success">
                   <i className="bi bi-check-circle me-1"></i>
                   Ready to process
                 </small>
               </div>
             </div>
             <Button 
               variant="outline-secondary" 
               size="sm"
               onClick={handleClear}
               disabled={uploading}
             >
               <i className="bi bi-x-lg"></i>
             </Button>
           </div>
         </div>
       )}
       
       {preview && (
         <div className="text-center mb-3">
           <h6>Preview:</h6>
           <div className="d-inline-block position-relative">
             <img 
               src={preview} 
               alt="Receipt preview" 
               style={{ maxWidth: '100%', maxHeight: '300px' }}
               className="border rounded shadow-sm"
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
       
       <div className="d-grid gap-2">
         <Button 
           variant={isAuthenticated ? "primary" : "secondary"}
           onClick={handleProcessReceipt}
           disabled={!file || uploading || !isAuthenticated}
           size="lg"
         >
           {uploading ? (
             <>
               <span className="spinner-border spinner-border-sm me-2" role="status"></span>
               Processing Receipt...
             </>
           ) : isAuthenticated ? (
             <>
               <i className="bi bi-magic me-2"></i>
               Process Receipt 
             </>
           ) : (
             <>
               <i className="bi bi-lock me-2"></i>
               Sign In to Process Receipt
             </>
           )}
         </Button>
         
         {file && !uploading && (
           <Button 
             variant="outline-secondary"
             onClick={handleClear}
             size="sm"
           >
             Clear Selection
           </Button>
         )}
       </div>

       {!isAuthenticated && (
         <Alert variant="warning" className="mt-3">
           <div className="d-flex align-items-center">
             <i className="bi bi-exclamation-triangle me-2"></i>
             <div>
               <strong>Sign in required</strong>
               <br />
               <small>Please sign in with Google to process receipts with AI and save them to your account.</small>
             </div>
           </div>
         </Alert>
       )}
     </Card.Body>
   </Card>
 );
};

export default ImageUploader;
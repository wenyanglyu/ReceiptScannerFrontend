import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Navbar, Nav } from 'react-bootstrap';
import ImageUploader from './components/ImageUploader';
import JsonDisplay from './components/JsonDisplay';
import Dashboard from './components/Dashboard';
import ReceiptHistory from './components/ReceiptHistory';
import axios from 'axios';

axios.defaults.withCredentials = false;

function App() {
  const [receiptData, setReceiptData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const API_BASE_URL = "https://receiptscannerbackend.onrender.com/api";

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      await axios.get(`${API_BASE_URL}/Receipt`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setError('Failed to load receipts. Please try again later.');
    }
  };

  const handleUploadSuccess = (data) => {
    setReceiptData(data);
    setActiveTab('edit');
  };

  const handleUpdateSuccess = () => {
    fetchReceipts();
    setActiveTab('history');
  };

  const handleEditReceipt = (receipt) => {
    setReceiptData(receipt);
    setActiveTab('edit');
  };

  const handleAddNewReceipt = () => {
    setActiveTab('upload');
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#home">Receipt Scanner</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link onClick={() => setActiveTab('upload')}>Upload</Nav.Link>
              {receiptData && (
                <Nav.Link onClick={() => setActiveTab('edit')}>Edit Receipt</Nav.Link>
              )}
              {!isMobile && (
                <Nav.Link onClick={() => setActiveTab('dashboard')}>Dashboard</Nav.Link>
              )}
              <Nav.Link onClick={() => setActiveTab('history')}>Receipt History</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="mt-4">
        {error && <div className="alert alert-danger">{error}</div>}

        {activeTab === 'upload' && (
          <ImageUploader onUploadSuccess={handleUploadSuccess} />
        )}

        {activeTab === 'edit' && receiptData && (
          <JsonDisplay 
            receiptData={receiptData}
            onUpdateSuccess={handleUpdateSuccess}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard />
        )}

        {activeTab === 'history' && (
          <ReceiptHistory
            onEditReceipt={handleEditReceipt}
            onAddNewReceipt={handleAddNewReceipt}
          />
        )}
      </Container>
    </>
  );
}

export default App;

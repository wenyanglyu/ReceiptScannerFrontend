import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Navbar, Nav, Tab, Tabs } from 'react-bootstrap';
import ImageUploader from './components/ImageUploader';
import JsonDisplay from './components/JsonDisplay';
import Dashboard from './components/Dashboard';
import ReceiptHistory from './components/ReceiptHistory'; // Import the new component
import axios from 'axios';

// Configure Axios defaults
axios.defaults.withCredentials = false; // Important for CORS

function App() {
  const [receiptData, setReceiptData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [error, setError] = useState(null);

  // API base URL - centralize it here
  const API_BASE_URL = "https://receiptscannerbackend.onrender.com/api";
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Fetch existing receipts when component mounts
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/Receipt`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      // We don't need to store receipts here since each component 
      // will fetch what it needs
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setError('Failed to load receipts. Please try again later.');
    }
  };

  const handleUploadSuccess = (data) => {
    setReceiptData(data);
    // Switch to the edit tab after successful upload
    setActiveTab('edit');
  };

const handleUpdateSuccess = (data) => {
  // Refresh the receipts list immediately
  fetchReceipts();
  // Switch to the receipt history tab to see the updated list
  setActiveTab('history'); // Change to history tab instead of dashboard
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
          <Navbar.Brand href="#home">Receipt Processor Demo</Navbar.Brand>
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
        
        <Tabs
          id="controlled-tab-example"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="upload" title="Upload Receipt">
            <Row>
              <Col xs={12} md={12}>
                <ImageUploader 
                  onUploadSuccess={handleUploadSuccess}
                />
              </Col>
            </Row>
          </Tab>         
          <Tab eventKey="edit" title="Edit Receipt" disabled={!receiptData}>
            <Row>
                <Col xs={12} md={12}>

                {receiptData ? (
                    <JsonDisplay 
                    receiptData={receiptData} 
                    onUpdateSuccess={handleUpdateSuccess}
                    />
                ) : (
                    <p>Please upload a receipt first.</p>
                )}
                </Col>
            </Row>
          </Tab>
          
          {!isMobile && (
            <Tab eventKey="dashboard" title="Dashboard">
              <Dashboard />
            </Tab>
          )}

            <Dashboard />
          </Tab>

          <Tab eventKey="history" title="Receipt History">
            <ReceiptHistory 
              onEditReceipt={handleEditReceipt}
              onAddNewReceipt={handleAddNewReceipt}
            />
          </Tab>
        </Tabs>
      </Container>
    </>
  );
}

export default App;

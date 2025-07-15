import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Navbar, Nav, Badge, Button, Alert, Modal, Dropdown } from 'react-bootstrap';
import ImageUploader from './components/ImageUploader';
import JsonDisplay from './components/JsonDisplay';
import Dashboard from './components/Dashboard';
import ReceiptHistory from './components/ReceiptHistory';
import axios from 'axios';

axios.defaults.withCredentials = false;

function App() {
  // Simple state management - logged in vs not logged in
  const [appState, setAppState] = useState({
    isAuthenticated: false,
    user: null,
    receiptsData: [], // User's data (empty if not logged in)
    isLoading: false
  });

  const [receiptData, setReceiptData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

  // Load saved authentication state on app startup
  useEffect(() => {
    const savedAuthState = localStorage.getItem('receiptScannerAuth');
    if (savedAuthState) {
      try {
        const authData = JSON.parse(savedAuthState);
        console.log('Restored login state:', authData.user?.name);
        setAppState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: authData.user
        }));
      } catch (error) {
        console.error('Failed to restore login state:', error);
        // If corrupted, clear it
        localStorage.removeItem('receiptScannerAuth');
      }
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // Load sample data for guest users or user data for authenticated users
    if (appState.isAuthenticated) {
      fetchUserReceipts();
    } else {
      loadSampleData();
    }
  }, [appState.isAuthenticated]);

  useEffect(() => {
    window.handleGoogleLogin = async (response) => {
      const idToken = response.credential;
      handleLogin(idToken);
    };
  }, []);

  // Load sample data for guest exploration
  const loadSampleData = async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));
      
      const response = await fetch('/data/receipts.json');
      const sampleReceipts = await response.json();
      
      // Transform to match API format
      const transformedData = Object.entries(sampleReceipts).map(([key, receipt]) => ({
        imageName: key,
        displayName: receipt.ImageFileName || key,
        receiptInfo: {
          ...receipt,
          HashIdentifier: key,
          ImageFileName: receipt.ImageFileName || key,
          ImageUrl: `/data/images/${key}`
        },
        isDemo: !appState.isAuthenticated // Mark as demo when not authenticated
      }));
      
      setAppState(prev => ({
        ...prev,
        receiptsData: transformedData,
        isLoading: false
      }));
      
    } catch (error) {
      console.error('Failed to load sample data:', error);
      setAppState(prev => ({ 
        ...prev, 
        receiptsData: [], 
        isLoading: false 
      }));
    }
  };

  // Fetch authenticated user's receipts
  const fetchUserReceipts = async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));
      
      const response = await axios.get(`${REACT_APP_API_BASE_URL}/Receipt`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appState.user?.token}`
        }
      });
      
      const userReceipts = response.data || [];
      
      setAppState(prev => ({
        ...prev,
        receiptsData: userReceipts,
        isLoading: false
      }));
      
    } catch (error) {
      console.error('Error fetching user receipts:', error);
      setAppState(prev => ({
        ...prev,
        receiptsData: [], // Empty is normal for new users
        isLoading: false
      }));
    }
  };

  // Handle successful upload
  const handleUploadSuccess = (data) => {
    console.log('Upload successful:', data);
    setReceiptData(data);
    
    // For authenticated users, refresh their data
    if (appState.isAuthenticated) {
      fetchUserReceipts();
    }
    
    setActiveTab('edit');
  };

  // Handle successful save/update
  const handleUpdateSuccess = () => {
    if (appState.isAuthenticated) {
      fetchUserReceipts();
    }
    setActiveTab('history');
  };

  // Handle editing a receipt
  const handleEditReceipt = (receipt) => {
    setReceiptData(receipt);
    setActiveTab('edit');
  };

  // Handle adding new receipt
  const handleAddNewReceipt = () => {
    setActiveTab('upload');
  };

  // Handle user login with real Google authentication
  const handleLogin = async (googleToken) => {
    try {
      // Decode the Google JWT token to get real user info
      const payload = JSON.parse(atob(googleToken.split('.')[1]));
      
      const user = {
        token: googleToken,
        name: payload.name,
        email: payload.email,
        picture: payload.picture
      };
      
      console.log('Real user logged in:', user);
      
      // Save to localStorage for persistence
      const authState = {
        user: user,
        timestamp: Date.now() // Optional: track when they logged in
      };
      localStorage.setItem('receiptScannerAuth', JSON.stringify(authState));
      
      setAppState(prev => ({
        ...prev,
        isAuthenticated: true,
        user: user
      }));
      
    } catch (error) {
      console.error('Login failed:', error);
      setError('Failed to process login. Please try again.');
    }
  };

  // Handle logout
  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('receiptScannerAuth');
    
    setAppState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
      receiptsData: []
    }));
    setReceiptData(null);
    setActiveTab('upload');
    
    console.log('User logged out');
    
    // Reload sample data for guest mode
    loadSampleData();
  };

  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="#home">
            Receipt Scanner 
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link onClick={() => setActiveTab('upload')}>Upload</Nav.Link>
              {receiptData && (
                <Nav.Link onClick={() => setActiveTab('edit')}>
                  Edit Receipt
                </Nav.Link>
              )}
              {!isMobile && (
                <Nav.Link onClick={() => setActiveTab('dashboard')}>
                  Dashboard
                </Nav.Link>
              )}
              <Nav.Link onClick={() => setActiveTab('history')}>
                Receipt History
              </Nav.Link>
            </Nav>
            <Nav>
              {!appState.isAuthenticated ? (
                <div id="googleSignInWrapper">
                  <div
                    id="g_id_onload"
                    data-client_id="397273423931-lgcm6halp6l5ifcnhqt88ua6veuvhgqr.apps.googleusercontent.com"
                    data-callback="handleGoogleLogin"
                    data-auto_prompt="false"
                  ></div>
                  <div
                    className="g_id_signin"
                    data-type="standard"
                    data-size="large"
                    data-theme="outline"
                    data-text="sign_in_with"
                    data-shape="rectangular"
                    data-logo_alignment="left"
                  ></div>
                </div>
              ) : (
                <Dropdown align="end">
                  <Dropdown.Toggle 
                    variant="link" 
                    id="user-dropdown"
                    className="user-avatar-btn p-0 border-0"
                  >
                    <div className="user-avatar">
                      {getUserInitials(appState.user?.name)}
                    </div>
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu>
                    <Dropdown.ItemText>
                      <strong>{appState.user?.name}</strong>
                      <br />
                      <small className="text-muted">{appState.user?.email}</small>
                    </Dropdown.ItemText>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={handleLogout}>
                      <i className="bi bi-box-arrow-right me-2"></i>
                      Sign Out
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="mt-4">
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {appState.isLoading && (
          <Alert variant="info">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              Loading receipts...
            </div>
          </Alert>
        )}

        {activeTab === 'upload' && (
          <ImageUploader 
            onUploadSuccess={handleUploadSuccess}
            isAuthenticated={appState.isAuthenticated}
            userToken={appState.user?.token}
          />
        )}

        {activeTab === 'edit' && receiptData && (
          <JsonDisplay 
            receiptData={receiptData}
            onUpdateSuccess={handleUpdateSuccess}
            isAuthenticated={appState.isAuthenticated}
            userToken={appState.user?.token}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            receiptsData={appState.receiptsData}
            isAuthenticated={appState.isAuthenticated}
            userToken={appState.user?.token}
          />
        )}

        {activeTab === 'history' && (
          <ReceiptHistory
            receiptsData={appState.receiptsData}
            onEditReceipt={handleEditReceipt}
            onAddNewReceipt={handleAddNewReceipt}
            isAuthenticated={appState.isAuthenticated}
            userToken={appState.user?.token}
          />
        )}
      </Container>

      {/* Avatar Styles */}
      <style jsx>{`
        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .user-avatar:hover {
          transform: scale(1.05);
          transition: transform 0.2s ease;
        }
        
        .user-avatar-btn:focus {
          box-shadow: none !important;
        }
      `}</style>
    </>
  );
}

export default App;
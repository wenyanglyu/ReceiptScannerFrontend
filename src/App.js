import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Navbar, Nav, Badge, Button, Alert, Modal, Card, Row, Col } from 'react-bootstrap';
import ImageUploader from './components/ImageUploader';
import JsonDisplay from './components/JsonDisplay';
import Dashboard from './components/Dashboard';
import ReceiptHistory from './components/ReceiptHistory';
import axios from 'axios';

// Configure axios base URL (no withCredentials needed for Authorization headers)
axios.defaults.baseURL = process.env.REACT_APP_API_BASE_URL;

axios.interceptors.request.use(request => {
  console.log('Making request to:', request.url);
  console.log('Request headers:', request.headers);
  return request;
});

function App() {
  // Simplified state management - authentication required for all functionality
  const [appState, setAppState] = useState({
    isAuthenticated: false,
    user: null,
    receiptsData: [], // Only populated when authenticated
    isLoading: false
  });

  const [receiptData, setReceiptData] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
  
  // Handle successful deletion and refresh receipt data
  const handleDeleteSuccess = async (deletedImageNames) => {
    console.log('handleDeleteSuccess called with:', deletedImageNames);
    
    try {
      // Force refresh from server
      console.log('Fetching fresh receipt data...');
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/Receipt`);
      
      console.log('Fresh receipt data:', response.data);
      
      setAppState(prev => ({
        ...prev,
        receiptsData: response.data || []
      }));
      
      console.log(`Successfully refreshed data after deleting ${deletedImageNames.length} receipts`);
    } catch (error) {
      console.error('Error refreshing receipts after delete:', error);
      
      // Fallback: filter out deleted receipts from current state
      console.log('Using fallback: filtering out deleted receipts locally');
      setAppState(prev => ({
        ...prev,
        receiptsData: prev.receiptsData.filter(
          receipt => !deletedImageNames.includes(receipt.imageName)
        )
      }));
    }
  };

  // Check session validity on app startup
  useEffect(() => {
    const checkAuthenticationState = async () => {
      const savedAuthState = localStorage.getItem('receiptScannerAuth');
      let savedUser = null;
      let savedToken = null;
      
      if (savedAuthState) {
        try {
          const authData = JSON.parse(savedAuthState);
          savedUser = authData.user;
          savedToken = authData.token;
        } catch (error) {
          console.error('Failed to parse saved auth state:', error);
          localStorage.removeItem('receiptScannerAuth');
          localStorage.removeItem('authToken');
        }
      }

      // If we have a saved token, set it in axios headers
      if (savedToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      }

      // Check if session is valid with backend
      try {
        setAppState(prev => ({ ...prev, isLoading: true }));
        
        const response = await axios.get(`${REACT_APP_API_BASE_URL}/auth/validate-session`);
        
        if (response.data.isValid) {
          console.log('Valid session found, user:', response.data.user.name);
          
          const user = {
            sub: response.data.user.id,
            name: response.data.user.name || savedUser?.name,
            email: response.data.user.email || savedUser?.email,
            picture: savedUser?.picture
          };
          
          setAppState(prev => ({
            ...prev,
            isAuthenticated: true,
            user: user,
            isLoading: false
          }));
          
          // Update localStorage with current user data
          localStorage.setItem('receiptScannerAuth', JSON.stringify({
            user: user,
            token: savedToken,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.log('Session validation failed:', error.response?.status);
        
        // Clear invalid tokens
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('authToken');
        
        // Only show "session expired" if user had previous session
        if (savedUser) {
          setError('Your session has expired. Please sign in again.');
        }
        // If no savedUser, this is a fresh visit - no error message needed
        
        localStorage.removeItem('receiptScannerAuth');
        setAppState(prev => ({ 
          ...prev, 
          isAuthenticated: false, 
          user: null,
          isLoading: false 
        }));
      }
    };

    checkAuthenticationState();
  }, [REACT_APP_API_BASE_URL]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Only fetch user data when authenticated
  useEffect(() => {
    if (appState.isAuthenticated) {
      fetchUserReceipts();
    }
  }, [appState.isAuthenticated]);

  // Handle OAuth redirect response
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const idToken = urlParams.get('id_token');

    if (idToken) {
      (async () => {
        try {
          setAppState(prev => ({ ...prev, isLoading: true }));
          
          const payload = JSON.parse(atob(idToken.split('.')[1]));

          // Send ID token to backend for validation and JWT token creation
          const response = await axios.post(`${REACT_APP_API_BASE_URL}/auth/google-login`, idToken, {
            headers: { 'Content-Type': 'application/json' }
          });

          console.log('Backend login successful:', response.data);

          // ✅ Get JWT token from response
          const jwtToken = response.data.token;
          
          // ✅ Set Authorization header for all future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
          
          // ✅ Store token in localStorage
          localStorage.setItem('authToken', jwtToken);

          // Create user object for UI (including profile picture from Google)
          const user = {
            sub: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture
          };

          // Save to localStorage with token
          const authState = { 
            user, 
            token: jwtToken, 
            timestamp: Date.now() 
          };
          localStorage.setItem('receiptScannerAuth', JSON.stringify(authState));

          setAppState(prev => ({
            ...prev,
            isAuthenticated: true,
            user: user,
            isLoading: false
          }));

          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Failed to process Google login:', error);
          setError('Failed to process login. Please try again.');
          setAppState(prev => ({ ...prev, isLoading: false }));
        }
      })();
    }
  }, [REACT_APP_API_BASE_URL]);

  // Fetch authenticated user's receipts (uses Authorization header automatically)
  const fetchUserReceipts = async () => {
    try {
      setAppState(prev => ({ ...prev, isLoading: true }));
      
      // Authorization header is set automatically via axios.defaults
      const response = await axios.get(`${REACT_APP_API_BASE_URL}/Receipt`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
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
      
      // If 401, session expired
      if (error.response?.status === 401) {
        console.log('Session expired, logging out');
        handleSessionExpired();
      } else {
        setAppState(prev => ({
          ...prev,
          receiptsData: [], // Empty is normal for new users
          isLoading: false
        }));
      }
    }
  };

  // Handle session expiration
  const handleSessionExpired = () => {
    // Clear Authorization header and tokens
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
    localStorage.removeItem('receiptScannerAuth');
    
    setAppState({
      isAuthenticated: false,
      user: null,
      receiptsData: [],
      isLoading: false
    });
    setReceiptData(null);
    setActiveTab('upload');
    setShowProfileModal(false);
    setError('Your session has expired. Please sign in again.');
  };

  // Handle successful upload
  const handleUploadSuccess = (data) => {
    console.log('Upload successful:', data);
    setReceiptData(data);
    
    // Refresh user's receipts
    fetchUserReceipts();
    setActiveTab('edit');
  };

  // Handle successful save/update
  const handleUpdateSuccess = () => {
    fetchUserReceipts();
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

  // Handle custom Google sign-in button click
  const handleGoogleSignIn = () => {
    setError(null); // Clear any previous error messages
    setAppState(prev => ({ ...prev, isLoading: true }));
    
    // Create Google OAuth URL to get ID token
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=397273423931-lgcm6halp6l5ifcnhqt88ua6veuvhgqr.apps.googleusercontent.com&` +
      `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
      `response_type=id_token token&` +
      `scope=openid email profile&` +
      `include_granted_scopes=true&` +
      `nonce=${Math.random().toString(36).substring(2, 15)}&` +
      `state=security_token`;
    
    window.location.href = googleAuthUrl;
  };

  // Handle logout with backend call
  const handleLogout = async () => {
    try {
      // Call backend logout (optional, since we're using stateless tokens)
      await axios.post(`${REACT_APP_API_BASE_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API fails
    }
    
    // ✅ Clear Authorization header and tokens
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
    localStorage.removeItem('receiptScannerAuth');
    
    setAppState({
      isAuthenticated: false,
      user: null,
      receiptsData: [],
      isLoading: false
    });
    setReceiptData(null);
    setActiveTab('upload');
    setShowProfileModal(false);
    
    console.log('User logged out');
  };

  // Handle profile image loading errors
  const handleImageError = () => {
    setProfileImageError(true);
  };

  // Reset image error when user changes
  useEffect(() => {
    setProfileImageError(false);
  }, [appState.user?.sub]);

  // Get user initials for avatar (fallback)
  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Add axios interceptor for automatic logout on 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        // Don't trigger logout during login attempts
        const isLoginEndpoint = error.config?.url?.includes('/auth/google-login') || 
                               error.config?.url?.includes('/auth/validate-session');
        
        if (error.response?.status === 401 && 
            appState.isAuthenticated && 
            !isLoginEndpoint) {
          console.log('401 detected, handling session expiration');
          handleSessionExpired();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [appState.isAuthenticated]);

  // Profile Modal Component
  const ProfileModal = () => (
    <Modal 
      show={showProfileModal} 
      onHide={() => setShowProfileModal(false)}
      centered
      size="sm"
    >
      <Modal.Body className="text-center p-4">
        <div className="mb-3">
          {appState.user?.picture && !profileImageError ? (
            <img
              src={appState.user.picture}
              alt="Profile"
              className="profile-modal-avatar"
              onError={handleImageError}
              onLoad={() => setProfileImageError(false)}
            />
          ) : (
            <div className="profile-modal-avatar-fallback">
              {getUserInitials(appState.user?.name)}
            </div>
          )}
        </div>
        
        <h5 className="mb-2" style={{ fontWeight: '600', color: '#2c3e50' }}>
          {appState.user?.name}
        </h5>
        <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
          {appState.user?.email}
        </p>
        
        <div className="d-grid gap-2">
          <Button
            variant="outline-danger"
            onClick={handleLogout}
            className="logout-btn"
          >
            <i className="bi bi-box-arrow-right me-2"></i>
            Sign Out
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );

  // Landing page for non-authenticated users
  const LandingPage = () => (
    <Container className="mt-5">
      <Row className="justify-content-center">
        <Col xs={12} md={8} lg={6}>
          <Card className="text-center shadow-lg border-0" style={{ borderRadius: '1rem' }}>
            <Card.Body className="p-5">
              {/* App Logo/Icon */}
              <div className="mb-4" style={{ fontSize: '4rem' }}>📄</div>
              
              {/* Welcome Message */}
              <h1 className="mb-4" style={{ fontWeight: '700', color: '#2c3e50' }}>
                Welcome to Receipt Scanner
              </h1>
              
              <p className="lead mb-4" style={{ color: '#6c757d' }}>
                Too many grocery receipts? Wondering what you've been buying? 
                Get organized and discover insights about your shopping habits with AI-powered receipt analysis.
              </p>
              
              {/* Feature Highlights */}
              <Row className="mb-5">
                <Col xs={12} md={4} className="mb-3">
                  <div className="feature-highlight">
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🤖</div>
                    <h6 style={{ fontWeight: '600' }}>Smart Scanning</h6>
                    <small className="text-muted">
                      AI automatically reads and organizes all your receipt data
                    </small>
                  </div>
                </Col>
                <Col xs={12} md={4} className="mb-3">
                  <div className="feature-highlight">
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                    <h6 style={{ fontWeight: '600' }}>Shopping Insights</h6>
                    <small className="text-muted">
                      Discover spending patterns and see what you buy most often
                    </small>
                  </div>
                </Col>
                <Col xs={12} md={4} className="mb-3">
                  <div className="feature-highlight">
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛒</div>
                    <h6 style={{ fontWeight: '600' }}>Receipt Manager</h6>
                    <small className="text-muted">
                      Keep all your receipts organized and easily searchable
                    </small>
                  </div>
                </Col>
              </Row>
              
              {/* Call to Action */}
              <div className="mb-4">
                <h5 style={{ fontWeight: '600', color: '#495057' }}>
                  Ready to organize your receipts?
                </h5>
                <p className="text-muted mb-4">
                  Sign in with Google to start scanning receipts and discovering your shopping patterns.
                </p>
              </div>
              
              {/* Custom Google Sign-In Button */}
              <div className="d-flex justify-content-center">
                <Button
                  variant="outline-primary"
                  size="lg"
                  onClick={handleGoogleSignIn}
                  className="custom-google-signin-btn px-4 py-3"
                  disabled={appState.isLoading}
                >
                  {appState.isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Signing in...
                    </>
                  ) : (
                    <>
                      <svg className="me-2" width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Sign in with Google
                    </>
                  )}
                </Button>
              </div>
                          
              {/* Privacy Notice */}
              <small className="text-muted mt-4 d-block">
                🔒 Your receipt data is securely stored and only accessible to you.
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );

  // If not authenticated, show landing page
  if (!appState.isAuthenticated) {
    return (
      <>
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand href="#home">
              Receipt Scanner
            </Navbar.Brand>
            <Nav className="ms-auto">
              <span className="navbar-text text-light">
                Sign in to get started
              </span>
            </Nav>
          </Container>
        </Navbar>
        
        <LandingPage />
        
        {error && (
          <Container className="mt-3">
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          </Container>
        )}
      </>
    );
  }

  // Main application for authenticated users
  return (
    <>
      <Navbar bg="secondary" variant="dark" expand="lg">
        <Container>
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
              {/* Profile Photo/Avatar */}
              <div 
                className="user-avatar-container"
                onClick={() => setShowProfileModal(true)}
              >
                {appState.user?.picture && !profileImageError ? (
                  <img
                    src={appState.user.picture}
                    alt="Profile"
                    className="user-avatar-image"
                    onError={handleImageError}
                    onLoad={() => setProfileImageError(false)}
                  />
                ) : (
                  <div className="user-avatar-fallback">
                    {getUserInitials(appState.user?.name)}
                  </div>
                )}
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Profile Modal */}
      <ProfileModal />

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
          />
        )}

        {activeTab === 'edit' && receiptData && (
          <JsonDisplay 
            receiptData={receiptData}
            onUpdateSuccess={handleUpdateSuccess}
            isAuthenticated={appState.isAuthenticated}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            receiptsData={appState.receiptsData}
          />
        )}

        {activeTab === 'history' && (
          <ReceiptHistory
            receiptsData={appState.receiptsData}
            onEditReceipt={handleEditReceipt}
            onAddNewReceipt={handleAddNewReceipt}
            onDeleteSuccess={handleDeleteSuccess}
            isAuthenticated={appState.isAuthenticated}
          />
        )}
      </Container>
    </>
  );
}

export default App;
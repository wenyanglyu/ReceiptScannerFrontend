import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Badge, Card, Row, Col, Modal, Form, Alert, 
  ButtonGroup, Dropdown, Offcanvas 
} from 'react-bootstrap';
import axios from 'axios';

const REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const ReceiptHistory = ({ 
  receiptsData = [],
  onEditReceipt, 
  onAddNewReceipt,
  onDeleteSuccess,
  isAuthenticated = true // Always authenticated now
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [filterDate, setFilterDate] = useState({ start: '', end: '' });
  const [filterStore, setFilterStore] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth >= 768 ? 'table' : 'cards';
  });

  const getWorkingImageUrl = (receipt) => {
    const imageUrl = receipt.receiptInfo?.imageUrl || receipt.receiptInfo?.ImageUrl;
    const hashId = receipt.imageName;

    // For real receipts, always use API proxy
    if (hashId) {
      return `${process.env.REACT_APP_API_BASE_URL}/receipt/image/${hashId}`;
    }

    return imageUrl || '/placeholder-receipt.png';
  };

  useEffect(() => {
    const handleResize = () => {
      const newViewMode = window.innerWidth >= 768 ? 'table' : 'cards';
      setViewMode(newViewMode);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedItems = () => {
    const sortableItems = [...receiptsData];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const aValue = getValueByPath(a, sortConfig.key);
        const bValue = getValueByPath(b, sortConfig.key);
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  };

  const getValueByPath = (obj, path) => {
    const keys = path.split('.');
    return keys.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
  };

  const toggleReceiptSelection = (receipt) => {
    if (isSelected(receipt.imageName)) {
      setSelectedReceipts(selectedReceipts.filter(item => item !== receipt.imageName));
    } else {
      setSelectedReceipts([...selectedReceipts, receipt.imageName]);
    }
  };

  const isSelected = (imageName) => {
    return selectedReceipts.includes(imageName);
  };

  const toggleSelectAll = () => {
    if (selectedReceipts.length === receiptsData.length) {
      setSelectedReceipts([]);
    } else {
      setSelectedReceipts(receiptsData.map(receipt => receipt.imageName));
    }
  };

  const handleViewReceipt = (receipt) => {
    setCurrentReceipt(receipt);
    setShowViewModal(true);
  };

  const handleEditReceipt = (receipt) => {
    setShowViewModal(false);
    if (onEditReceipt && typeof onEditReceipt === 'function') {
      onEditReceipt(receipt);
    }
  };

  const formatCurrency = (amount) => {
    const value = parseFloat(amount) || 0;
    return '$' + value.toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getSelectedTotal = () => {
    return receiptsData
      .filter(receipt => isSelected(receipt.imageName))
      .reduce((total, receipt) => {
        const calculatedTotal = receipt.receiptInfo?.calculatedTotal || receipt.receiptInfo?.CalculatedTotal;
        const value = typeof calculatedTotal === 'number' ? calculatedTotal : 
                     (calculatedTotal ? parseFloat(calculatedTotal) : 0);
        return total + value;
      }, 0);
  };

  // In ReceiptHistory.js, update the handleDeleteSelected function:
const handleDeleteSelected = async () => {
  if (selectedReceipts.length === 0) return;

  if (window.confirm(`Are you sure you want to delete ${selectedReceipts.length} receipt(s)?`)) {
    try {
      setLoading(true);
      
      console.log('Deleting receipts:', selectedReceipts); // Add this

      const response = await axios.post(`${REACT_APP_API_BASE_URL}/Receipt/delete-multiple`, {
        imageNames: selectedReceipts
      }, {
        headers: {
           'Content-Type': 'application/json'
        }
      });
      
      console.log('Delete response:', response.data); // Add this
      
      if (response.data.success) {
        setSelectedReceipts([]);
        setError('');
        
        // Add detailed logging
        console.log('Delete successful, refreshing data...');
        
        // Force refresh the parent component's data
        if (onDeleteSuccess && typeof onDeleteSuccess === 'function') {
          console.log('Calling onDeleteSuccess callback');
          onDeleteSuccess(selectedReceipts);
        } else {
          console.log('No onDeleteSuccess callback provided');
          // Fallback: force page reload
          window.location.reload();
        }
      } else {
        console.log('Delete failed:', response.data);
        setError('Failed to delete receipts. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting receipts:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please sign in again.');
      } else {
        setError(`Failed to delete receipts: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }
};

  const sortedReceipts = getSortedItems();

  // Show empty state when user has no data
if (receiptsData.length === 0) {
  return (
    <Card className="text-center py-5">
      <Card.Body>
        <div className="welcome-screen">
          <div className="welcome-icon mb-4" style={{ fontSize: '4rem' }}>🛒</div>
          <h2>Start Managing Your Receipts!</h2>
          <p className="text-muted mb-4">
            Upload your grocery receipts to see spending insights and track what you buy most often
          </p>
          
          <div className="d-grid gap-2 col-6 mx-auto">
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => onAddNewReceipt()}
            >
              📤 Upload Your First Receipt
            </Button>
          </div>
          
          <div className="features-preview mt-5">
            <h6>What you'll discover:</h6>
            <div className="row text-center mt-3">
              <div className="col-md-4">
                <div className="feature-item">
                  <div style={{ fontSize: '2rem' }}>📊</div>
                  <small>Spending Patterns</small>
                </div>
              </div>
              <div className="col-md-4">
                <div className="feature-item">
                  <div style={{ fontSize: '2rem' }}>🛍️</div>
                  <small>Favorite Items</small>
                </div>
              </div>
              <div className="col-md-4">
                <div className="feature-item">
                  <div style={{ fontSize: '2rem' }}>📝</div>
                  <small>Organized Receipts</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

  // Mobile Card Component for Individual Receipt
  const ReceiptCard = ({ receipt }) => (
    <Card className="receipt-card mb-3 shadow-sm">
      <Card.Body className="p-3">
        <Row className="align-items-center">
          <Col xs={1} className="pe-2">
            <Form.Check 
              type="checkbox"
              checked={isSelected(receipt.imageName)}
              onChange={() => toggleReceiptSelection(receipt)}
              className="receipt-checkbox"
            />
          </Col>
          
          <Col xs={7} className="ps-2">
            <div className="receipt-info">
              <div className="d-flex align-items-center mb-1">
                <h6 className="mb-0 text-truncate receipt-name me-2">
                  {(receipt.displayName || receipt.imageName).length > 20 
                    ? (receipt.displayName || receipt.imageName).substring(0, 20) + '...' 
                    : (receipt.displayName || receipt.imageName)
                  }
                </h6>
              </div>
              <div className="receipt-details">
                <small className="text-muted d-block">
                  📅 {formatDate(receipt.receiptInfo?.date || receipt.receiptInfo?.Date)}
                </small>
                <div className="mt-1">
                  <Badge bg="info" className="me-2">
                    {(receipt.receiptInfo?.items || receipt.receiptInfo?.Items || []).length} items
                  </Badge>
                  <span className="fw-bold text-success">
                    {formatCurrency(receipt.receiptInfo?.calculatedTotal || receipt.receiptInfo?.CalculatedTotal || 0)}
                  </span>
                </div>
              </div>
            </div>
          </Col>
          
          <Col xs={4} className="text-end">
            <Button 
              variant="outline-primary" 
              size="sm"
              className="receipt-actions-btn"
              onClick={() => handleViewReceipt(receipt)}
            >
              View
            </Button>
            <Button 
              variant="outline-success" 
              size="sm"
              className="receipt-actions-btn mt-1"
              onClick={() => handleEditReceipt(receipt)}
            >
              Edit
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <Card className="receipt-history-card">
        <Card.Header className="p-3">
          <Row className="align-items-center">
            <Col xs={6}>
              <h4 className="mb-0">Receipts</h4>
              <small className="text-muted">
                {receiptsData.length} total
              </small>
            </Col>
            <Col xs={6} className="text-end">
              <div className="d-md-none">
                <ButtonGroup size="sm">
                  <Button 
                    variant="primary" 
                    onClick={() => onAddNewReceipt()}
                    className="me-1"
                  >
                    ➕
                  </Button>
                  <Button 
                    variant="outline-secondary"
                    onClick={() => setShowFilters(true)}
                  >
                    🔍
                  </Button>
                </ButtonGroup>
              </div>
              
              <div className="d-none d-md-block">
                <Button 
                  variant="primary" 
                  className="me-2" 
                  onClick={() => onAddNewReceipt()}
                >
                  Add New Receipt
                </Button>
                <Button 
                  variant="outline-secondary"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filters
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Header>

        <Card.Body className="p-3">
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
                         
          {showFilters && (
            <Card className="mb-3 filter-card">
              <Card.Body className="p-3">
                <Row className="g-3">
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Start Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        size="sm"
                        value={filterDate.start}
                        onChange={(e) => setFilterDate({...filterDate, start: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">End Date</Form.Label>
                      <Form.Control 
                        type="date" 
                        size="sm"
                        value={filterDate.end}
                        onChange={(e) => setFilterDate({...filterDate, end: e.target.value})}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={4}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Store Name</Form.Label>
                      <Form.Control 
                        type="text" 
                        size="sm"
                        placeholder="Filter by store name"
                        value={filterStore}
                        onChange={(e) => setFilterStore(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={2} className="d-flex align-items-end">
                    <Button variant="primary" size="sm" className="w-100">
                      Apply
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}
          
          {selectedReceipts.length > 0 && (
            <Alert variant="primary" className="d-flex justify-content-between align-items-center p-2 mb-3">
              <div>
                <strong>{selectedReceipts.length}</strong> selected • 
                <strong className="ms-1">{formatCurrency(getSelectedTotal())}</strong>
              </div>
              <Button 
                variant="danger" 
                size="sm"
                onClick={handleDeleteSelected}
              >
                🗑️ Delete
              </Button>
            </Alert>
          )}
          
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading receipts...</p>
            </div>
          ) : (
            <>
              {viewMode === 'cards' && (
                <div className="receipt-cards-container">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Form.Check 
                      type="checkbox"
                      label={`Select All (${receiptsData.length})`}
                      onChange={toggleSelectAll}
                      checked={selectedReceipts.length === receiptsData.length && receiptsData.length > 0}
                      className="fw-bold"
                    />
                    <Dropdown>
                      <Dropdown.Toggle variant="outline-secondary" size="sm">
                        Sort: {sortConfig.key ? sortConfig.key.split('.').pop() : 'None'}
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => requestSort('receiptInfo.date')}>
                          Date {sortConfig.key === 'receiptInfo.date' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => requestSort('receiptInfo.calculatedTotal')}>
                          Amount {sortConfig.key === 'receiptInfo.calculatedTotal' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => requestSort('receiptInfo.items.length')}>
                          Items {sortConfig.key === 'receiptInfo.items.length' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </div>
                  
                  {sortedReceipts.map((receipt) => (
                    <ReceiptCard key={receipt.imageName} receipt={receipt} />
                  ))}
                  
                  {sortedReceipts.length === 0 && (
                    <Card className="text-center py-4">
                      <Card.Body>
                        <h6 className="text-muted mb-2">No Receipts Found</h6>
                        <p className="mb-3 text-muted">
                          Upload your first receipt to get started.
                        </p>
                        <Button 
                          variant="primary"
                          onClick={() => onAddNewReceipt()}
                        >
                          Upload Receipt
                        </Button>
                      </Card.Body>
                    </Card>
                  )}
                </div>
              )}
              
              {viewMode === 'table' && (
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>
                          <Form.Check 
                            type="checkbox"
                            onChange={toggleSelectAll}
                            checked={selectedReceipts.length === receiptsData.length && receiptsData.length > 0}
                          />
                        </th>
                        <th onClick={() => requestSort('receiptInfo.date')} className="sortable-header">
                          Date {sortConfig.key === 'receiptInfo.date' && (
                            sortConfig.direction === 'ascending' ? '↑' : '↓'
                          )}
                        </th>
                        <th onClick={() => requestSort('displayName')} className="sortable-header">
                          Receipt {sortConfig.key === 'displayName' && (
                            sortConfig.direction === 'ascending' ? '↑' : '↓'
                          )}
                        </th>
                        <th onClick={() => requestSort('receiptInfo.items.length')} className="sortable-header">
                          Items {sortConfig.key === 'receiptInfo.items.length' && (
                            sortConfig.direction === 'ascending' ? '↑' : '↓'
                          )}
                        </th>
                        <th onClick={() => requestSort('receiptInfo.calculatedTotal')} className="sortable-header">
                          Total {sortConfig.key === 'receiptInfo.calculatedTotal' && (
                            sortConfig.direction === 'ascending' ? '↑' : '↓'
                          )}
                        </th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedReceipts.map((receipt) => (
                        <tr 
                          key={receipt.imageName}
                          className={isSelected(receipt.imageName) ? 'table-primary' : ''}
                        >
                          <td>
                            <Form.Check 
                              type="checkbox"
                              checked={isSelected(receipt.imageName)}
                              onChange={() => toggleReceiptSelection(receipt)}
                            />
                          </td>
                          <td>{formatDate(receipt.receiptInfo?.date || receipt.receiptInfo?.Date)}</td>
                          <td>{receipt.displayName || receipt.imageName || 'Unknown Receipt'}</td>
                          <td>
                            <Badge bg="info">
                              {(receipt.receiptInfo?.items || receipt.receiptInfo?.Items || []).length}
                            </Badge>
                          </td>
                          <td>{formatCurrency(receipt.receiptInfo?.calculatedTotal || receipt.receiptInfo?.CalculatedTotal || 0)}</td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="me-1"
                              onClick={() => handleViewReceipt(receipt)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              onClick={() => handleEditReceipt(receipt)}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {sortedReceipts.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            <div>
                              <h6 className="text-muted mb-2">No Receipts Found</h6>
                              <p className="mb-3 text-muted">
                                Upload your first receipt to get started.
                              </p>
                              <Button 
                                variant="primary"
                                onClick={() => onAddNewReceipt()}
                              >
                                Upload Receipt
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Mobile Filters Offcanvas */}
      <Offcanvas 
        show={showFilters && viewMode === 'cards'} 
        onHide={() => setShowFilters(false)}
        placement="bottom"
        className="mobile-filters-offcanvas"
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Filter Receipts</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Form>
            <Row className="g-3">
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={filterDate.start}
                    onChange={(e) => setFilterDate({...filterDate, start: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>End Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={filterDate.end}
                    onChange={(e) => setFilterDate({...filterDate, end: e.target.value})}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group>
                  <Form.Label>Store Name</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="Filter by store name"
                    value={filterStore}
                    onChange={(e) => setFilterStore(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Button variant="primary" className="w-100" onClick={() => setShowFilters(false)}>
                  Apply Filters
                </Button>
              </Col>
            </Row>
          </Form>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Receipt Details Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)}
        size="lg"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {currentReceipt?.displayName || currentReceipt?.imageName || 'Receipt Details'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentReceipt && (
            <Row>
              <Col xs={12} md={5} className="mb-3 mb-md-0">
                <div className="receipt-image-container mb-3">
                  <img 
                    src={getWorkingImageUrl(currentReceipt)}
                    alt="Receipt"
                    className="receipt-image"
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const placeholder = e.target.parentNode.querySelector('.image-placeholder');
                      if (!placeholder) {
                        const div = document.createElement('div');
                        div.className = 'image-placeholder d-flex align-items-center justify-content-center bg-light text-muted p-4';
                        div.style.minHeight = '200px';
                        div.style.borderRadius = '8px';
                        div.innerHTML = '<div class="text-center"><i class="fas fa-image fa-2x mb-2"></i><br>Image Not Available</div>';
                        e.target.parentNode.appendChild(div);
                      }
                    }}
                  />
                </div>
                <div className="receipt-info-summary">
                  <p><strong>File:</strong> {currentReceipt.displayName || currentReceipt.imageName}</p>
                  <p><strong>Date:</strong> {formatDate(currentReceipt.receiptInfo?.date || currentReceipt.receiptInfo?.Date)}</p>
                  <p><strong>Total:</strong> {formatCurrency(currentReceipt.receiptInfo?.calculatedTotal || currentReceipt.receiptInfo?.CalculatedTotal || 0)}</p>
                </div>
              </Col>
              <Col xs={12} md={7}>
                <h5>Items ({(currentReceipt.receiptInfo?.items || currentReceipt.receiptInfo?.Items || []).length})</h5>
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <Table striped size="sm">
                    <thead className="sticky-top bg-white">
                      <tr>
                        <th style={{ minWidth: '150px' }}>Item</th>
                        <th className="text-center" style={{ minWidth: '80px' }}>Qty</th>
                        <th className="text-end" style={{ minWidth: '80px' }}>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(currentReceipt.receiptInfo?.items || currentReceipt.receiptInfo?.Items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ minWidth: '150px' }}>
                            <div className="item-name" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                              {item.productName || item.ProductName || item.casualName || item.CasualName || 'Unknown Item'}
                            </div>
                            {(item.category || item.Category) && (
                              <small className="text-muted d-block" style={{ wordWrap: 'break-word' }}>
                                {item.category || item.Category}
                              </small>
                            )}
                            {(item.casualName || item.CasualName) && 
                             (item.casualName || item.CasualName) !== (item.productName || item.ProductName) && (
                              <small className="text-info d-block" style={{ wordWrap: 'break-word' }}>
                                "{item.casualName || item.CasualName}"
                              </small>
                            )}
                          </td>
                          <td className="text-center" style={{ minWidth: '80px' }}>
                            {item.quantity || item.Quantity || 1} {item.unit || item.Unit || 'item'}
                          </td>
                          <td className="text-end fw-bold" style={{ minWidth: '80px' }}>
                            {formatCurrency(item.price || item.Price || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => handleEditReceipt(currentReceipt)}
          >
            Edit Receipt
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Styles */}
      <style>{`
        .sortable-header {
          cursor: pointer;
          user-select: none;
        }
        
        .sortable-header:hover {
          background-color: #f8f9fa;
        }
        
        .receipt-actions-btn {
          min-width: 60px;
        }
        
        .welcome-screen .feature-item {
          padding: 1rem;
        }
        
        @media (max-width: 767.98px) {
          .receipt-actions-btn {
            width: 100%;
            margin-bottom: 0.25rem;
          }
        }
      `}</style>
    </>
  );
};

export default ReceiptHistory;
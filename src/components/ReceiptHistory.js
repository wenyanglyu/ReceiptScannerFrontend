// src/components/ReceiptHistory.js
import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Badge, Card, Row, Col, Modal, Form, Alert, 
  ButtonGroup, Dropdown, InputGroup, Offcanvas 
} from 'react-bootstrap';
import axios from 'axios';
import './ReceiptHistory.css';

const API_BASE_URL = "https://receiptscannerbackend.onrender.com/api";

const ReceiptHistory = ({ onEditReceipt, onAddNewReceipt }) => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState(null);
  const [filterDate, setFilterDate] = useState({ start: '', end: '' });
  const [filterStore, setFilterStore] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    // Auto-detect device type and set appropriate default view
    return window.innerWidth >= 768 ? 'table' : 'cards';
  });

  useEffect(() => {
    fetchReceipts();
    
    // Handle window resize to automatically switch view modes
    const handleResize = () => {
      const newViewMode = window.innerWidth >= 768 ? 'table' : 'cards';
      setViewMode(newViewMode);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/Receipt`);
      setReceipts(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to load receipts. Please try again.');
      setLoading(false);
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedItems = () => {
    const sortableItems = [...receipts];
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
    if (selectedReceipts.length === receipts.length) {
      setSelectedReceipts([]);
    } else {
      setSelectedReceipts(receipts.map(receipt => receipt.imageName));
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
    return receipts
      .filter(receipt => isSelected(receipt.imageName))
      .reduce((total, receipt) => {
        const calculatedTotal = receipt.receiptInfo?.calculatedTotal;
        const value = typeof calculatedTotal === 'number' ? calculatedTotal : 
                     (calculatedTotal ? parseFloat(calculatedTotal) : 0);
        return total + value;
      }, 0);
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedReceipts.length} receipt(s)?`)) {
      try {
        setLoading(true);
        const response = await axios.post(`${API_BASE_URL}/Receipt/delete-multiple`, {
          imageNames: selectedReceipts
        });
        
        if (response.data.success) {
          fetchReceipts();
          setSelectedReceipts([]);
          alert(`Successfully deleted ${response.data.deletedCount} receipt(s)`);
        } else {
          setError('Failed to delete receipts. Please try again.');
        }
      } catch (err) {
        console.error('Error deleting receipts:', err);
        setError(`Failed to delete receipts: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const sortedReceipts = getSortedItems();

  // Mobile Card Component for Individual Receipt
  const ReceiptCard = ({ receipt }) => (
    <Card className="receipt-card mb-3 shadow-sm">
      <Card.Body className="p-3">
        <Row className="align-items-center">
          {/* Selection Checkbox */}
          <Col xs={1} className="pe-2">
            <Form.Check 
              type="checkbox"
              checked={isSelected(receipt.imageName)}
              onChange={() => toggleReceiptSelection(receipt)}
              className="receipt-checkbox"
            />
          </Col>
          
          {/* Receipt Info */}
          <Col xs={7} className="ps-2">
            <div className="receipt-info">
              <h6 className="mb-1 text-truncate receipt-name">
                {receipt.imageName.length > 20 
                  ? receipt.imageName.substring(0, 20) + '...' 
                  : receipt.imageName
                }
              </h6>
              <div className="receipt-details">
                <small className="text-muted d-block">
                  📅 {formatDate(receipt.receiptInfo?.date)}
                </small>
                <div className="mt-1">
                  <Badge bg="info" className="me-2">
                    {receipt.receiptInfo?.items?.length || 0} items
                  </Badge>
                  <span className="fw-bold text-success">
                    {formatCurrency(receipt.receiptInfo?.calculatedTotal || 0)}
                  </span>
                </div>
              </div>
            </div>
          </Col>
          
          {/* Action Buttons */}
          <Col xs={4} className="text-end">
            <Button 
              variant="outline-primary" 
              size="sm"
              className="receipt-actions-btn"
              onClick={() => handleViewReceipt(receipt)}
            >
              View Details
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <Card className="receipt-history-card">
        {/* Header */}
        <Card.Header className="p-3">
          <Row className="align-items-center">
            <Col xs={6}>
              <h4 className="mb-0">Receipts</h4>
            </Col>
            <Col xs={6} className="text-end">
              {/* Mobile: Compact header buttons */}
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
              
              {/* Desktop: Full buttons */}
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
          {error && <Alert variant="danger">{error}</Alert>}
          
          {/* Desktop Filters */}
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
          
          {/* Selection Summary */}
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
          
          {/* Content */}
          {loading ? (
            <div className="text-center py-4">
              <p>Loading receipts...</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (for mobile devices) */}
              {viewMode === 'cards' && (
                <div className="receipt-cards-container">
                  {/* Select All for Mobile */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <Form.Check 
                      type="checkbox"
                      label="Select All"
                      onChange={toggleSelectAll}
                      checked={selectedReceipts.length === receipts.length && receipts.length > 0}
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
                        <p className="mb-0 text-muted">No receipts found</p>
                      </Card.Body>
                    </Card>
                  )}
                </div>
              )}
              
              {/* Desktop Table View (for desktop devices) */}
              {viewMode === 'table' && (
                <div className="table-responsive">
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>
                          <Form.Check 
                            type="checkbox"
                            onChange={toggleSelectAll}
                            checked={selectedReceipts.length === receipts.length && receipts.length > 0}
                          />
                        </th>
                        <th onClick={() => requestSort('receiptInfo.date')} className="sortable-header">
                          Date {sortConfig.key === 'receiptInfo.date' && (
                            sortConfig.direction === 'ascending' ? '↑' : '↓'
                          )}
                        </th>
                        <th onClick={() => requestSort('imageName')} className="sortable-header">
                          Receipt {sortConfig.key === 'imageName' && (
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
                          <td>{formatDate(receipt.receiptInfo?.date)}</td>
                          <td>{receipt.imageName}</td>
                          <td>
                            <Badge bg="info">{receipt.receiptInfo?.items?.length || 0}</Badge>
                          </td>
                          <td>{formatCurrency(receipt.receiptInfo?.calculatedTotal || 0)}</td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="me-1"
                              onClick={() => handleViewReceipt(receipt)}
                            >
                              View Details
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
                          <td colSpan="6" className="text-center">No receipts found</td>
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

      {/* Receipt Details Modal - Responsive */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)}
        size="lg"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Receipt Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentReceipt && (
            <Row>
              <Col xs={12} md={5} className="mb-3 mb-md-0">
                <div className="receipt-image-container mb-3">
                  <img 
                    src={currentReceipt.receiptInfo?.imageUrl}
                    alt="Receipt"
                    className="receipt-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const placeholder = e.target.parentNode.querySelector('.image-placeholder');
                      if (!placeholder) {
                        const div = document.createElement('div');
                        div.className = 'image-placeholder d-flex align-items-center justify-content-center bg-light text-muted p-4';
                        div.style.minHeight = '200px';
                        div.innerHTML = '<div class="text-center"><i class="fas fa-image fa-2x mb-2"></i><br>Image Not Available</div>';
                        e.target.parentNode.appendChild(div);
                      }
                    }}
                  />
                </div>
                <div className="receipt-info-summary">
                  <p><strong>Image:</strong> {currentReceipt.imageName}</p>
                  <p><strong>Date:</strong> {formatDate(currentReceipt.receiptInfo?.date)}</p>
                  <p><strong>Total:</strong> {formatCurrency(currentReceipt.receiptInfo?.calculatedTotal || 0)}</p>
                </div>
              </Col>
              <Col xs={12} md={7}>
                <h5>Items ({currentReceipt.receiptInfo?.items?.length || 0})</h5>
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
                      {(currentReceipt.receiptInfo?.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ minWidth: '150px' }}>
                            <div className="item-name" style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                              {/* ✅ FIXED: Use correct property names */}
                              {item.productName || item.casualName || 'Unknown Item'}
                            </div>
                            {item.category && (
                              <small className="text-muted d-block" style={{ wordWrap: 'break-word' }}>
                                {item.category}
                              </small>
                            )}
                            {/* ✅ ADDED: Show casual name as subtitle if different from product name */}
                            {item.casualName && item.casualName !== item.productName && (
                              <small className="text-info d-block" style={{ wordWrap: 'break-word' }}>
                                "{item.casualName}"
                              </small>
                            )}
                          </td>
                          <td className="text-center" style={{ minWidth: '80px' }}>
                            {/* ✅ FIXED: Use correct property names */}
                            {item.quantity} {item.unit}
                          </td>
                          <td className="text-end fw-bold" style={{ minWidth: '80px' }}>
                            {formatCurrency(item.price)}
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
    </>
  );
};

export default ReceiptHistory;

// src/components/ReceiptHistory.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Card, Row, Col, Modal, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import './ReceiptHistory.css'; // Make sure to create this CSS file

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

  // Fetch receipts on component mount
  useEffect(() => {
    fetchReceipts();
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

  // Handle sort by column
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted items
  const getSortedItems = () => {
    const sortableItems = [...receipts];
    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        // Access nested properties based on key path
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

  // Helper function to get value from nested object path
  const getValueByPath = (obj, path) => {
    const keys = path.split('.');
    return keys.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
  };

  // Handle receipt selection
  const toggleReceiptSelection = (receipt) => {
    if (isSelected(receipt.imageName)) {
      setSelectedReceipts(selectedReceipts.filter(item => item !== receipt.imageName));
    } else {
      setSelectedReceipts([...selectedReceipts, receipt.imageName]);
    }
  };

  // Check if receipt is selected
  const isSelected = (imageName) => {
    return selectedReceipts.includes(imageName);
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedReceipts.length === receipts.length) {
      setSelectedReceipts([]);
    } else {
      setSelectedReceipts(receipts.map(receipt => receipt.imageName));
    }
  };



  // Handle view receipt details
  const handleViewReceipt = (receipt) => {
    setCurrentReceipt(receipt);
    setShowViewModal(true);
  };

  // Handle edit receipt
  const handleEditReceipt = (receipt) => {
    setShowViewModal(false);
    if (onEditReceipt && typeof onEditReceipt === 'function') {
      onEditReceipt(receipt);
    }
  };

// Simplified formatting function
const formatCurrency = (amount) => {
  const value = parseFloat(amount) || 0;
  return '$' + value.toFixed(2);
};

  // Apply filters
  const applyFilters = () => {
    // This would normally be an API call with filter parameters
    // For now, we'll filter the client-side data
    fetchReceipts(); // Fetch all receipts again
    // Then apply filters client-side (in a real app, you'd do this on the server)
  };


// Simplified function to get total for selected receipts
const getSelectedTotal = () => {
  return receipts
    .filter(receipt => isSelected(receipt.imageName))
    .reduce((total, receipt) => {
      // Make sure the value exists and is a number
      const calculatedTotal = receipt.receiptInfo?.calculatedTotal;
      // Convert to number and handle any conversion errors
      const value = typeof calculatedTotal === 'number' ? calculatedTotal : 
                   (calculatedTotal ? parseFloat(calculatedTotal) : 0);
      return total + value;
    }, 0);
};

// Updated handleDeleteSelected to call the backend API
const handleDeleteSelected = async () => {
  if (window.confirm(`Are you sure you want to delete ${selectedReceipts.length} receipt(s)?`)) {
    try {
      setLoading(true);
      
      // Call the backend API to delete the selected receipts
      const response = await axios.post(`${API_BASE_URL}/Receipt/delete-multiple`, {
        imageNames: selectedReceipts
      });
      
      if (response.data.success) {
        // Refresh the list after deletion
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

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h4>Receipt History</h4>
        <div>
          <Button 
            variant="primary" 
            className="me-2" 
            onClick={() => onAddNewReceipt()}
          >
            Add New Receipt
          </Button>
          <Button 
            variant="danger" 
            disabled={selectedReceipts.length === 0}
            onClick={handleDeleteSelected}
          >
            Delete Selected
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        {/* Filters */}
        <Row className="mb-3">
          <Col md={3}>
            <Form.Group>
              <Form.Label>Start Date</Form.Label>
              <Form.Control 
                type="date" 
                value={filterDate.start}
                onChange={(e) => setFilterDate({...filterDate, start: e.target.value})}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>End Date</Form.Label>
              <Form.Control 
                type="date" 
                value={filterDate.end}
                onChange={(e) => setFilterDate({...filterDate, end: e.target.value})}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label>Store</Form.Label>
              <Form.Control 
                type="text" 
                placeholder="Filter by store name"
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={3} className="d-flex align-items-end">
            <Button variant="outline-primary" onClick={applyFilters}>
              Apply Filters
            </Button>
          </Col>
        </Row>
        
        {selectedReceipts.length > 0 && (
          <div className="mb-3 p-2 bg-light rounded">
            <span className="me-2">
              <strong>{selectedReceipts.length}</strong> receipt(s) selected
            </span>
            <span className="me-2">
              Total: <strong>{formatCurrency(getSelectedTotal())}</strong>
            </span>
          </div>
        )}
        
        <div className="table-responsive">
          {loading ? (
            <p>Loading receipts...</p>
          ) : (
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
                    <td>{receipt.receiptInfo.date}</td>
                    <td>{receipt.imageName}</td> {/* Show full image name */}
                    <td>
                      <Badge bg="info">{receipt.receiptInfo.items.length}</Badge>
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
          )}
        </div>
      </Card.Body>

      {/* Receipt Details Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Receipt Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {currentReceipt && (
            <Row>
              <Col md={5}>
                <div className="receipt-image-container mb-3">
                  <img 
                    src={currentReceipt.receiptInfo.imageUrl || `${API_BASE_URL}/Receipt/image/${currentReceipt.imageName}`}
                    alt="Receipt"
                    className="img-fluid"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/fallback-receipt.png'; 
                    }}
                  />
                </div>
                <div>
                  <p><strong>Image:</strong> {currentReceipt.imageName}</p>
                  <p><strong>Date:</strong> {currentReceipt.receiptInfo.date}</p>
                  <p><strong>Total:</strong> {formatCurrency(currentReceipt.receiptInfo?.calculatedTotal || 0)}</p>
                </div>
              </Col>
              <Col md={7}>
                <h5>Items ({currentReceipt.receiptInfo.items.length})</h5>
                <Table striped size="sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentReceipt.receiptInfo.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div>{item.product_name}</div>
                          <small className="text-muted">{item.category}</small>
                        </td>
                        <td>{item.quantity} {item.unit}</td>
                        <td>{formatCurrency(item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
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
    </Card>
  );
};

export default ReceiptHistory;

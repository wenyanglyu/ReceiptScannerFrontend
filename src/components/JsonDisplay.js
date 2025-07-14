import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Form, Button, Row, Col, InputGroup, 
  Modal, Badge, Alert 
} from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const JsonDisplay = ({ 
  receiptData, 
  onUpdateSuccess,
  isAuthenticated = false,
  userToken = null
}) => {
  const [editableData, setEditableData] = useState(null);
  const [receiptDate, setReceiptDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth >= 768 ? 'table' : 'cards';
  });
  const [editingItem, setEditingItem] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (receiptData) {
      console.log('JsonDisplay received receiptData:', receiptData);
      console.log('Items array:', receiptData.receiptInfo?.items);
      
      setEditableData({
        ...receiptData,
        receiptInfo: {
          ...receiptData.receiptInfo,
          // Convert capitalized fields to lowercase for consistent usage
          items: (receiptData.receiptInfo?.Items || receiptData.receiptInfo?.items || []).map(item => ({
            productName: item.ProductName || item.productName,
            casualName: item.CasualName || item.casualName,
            price: item.Price || item.price,
            quantity: item.Quantity || item.quantity,
            unit: item.Unit || item.unit,
            category: item.Category || item.category
          }))
        }
      });
      
      const currentDate = new Date().toISOString().split('T')[0];
      setReceiptDate(receiptData.receiptInfo?.Date || receiptData.receiptInfo?.date || currentDate);
    }

    // Handle window resize for responsive view switching
    const handleResize = () => {
      const newViewMode = window.innerWidth >= 768 ? 'table' : 'cards';
      setViewMode(newViewMode);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [receiptData]);

  if (!editableData) {
    return (
      <Card className="text-center p-4">
        <Card.Body>
          <p className="mb-0">No receipt data to display.</p>
        </Card.Body>
      </Card>
    );
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...(editableData.receiptInfo?.items || [])];
    
    if (field === 'price' || field === 'quantity') {
      // Allow empty string and partial numbers during typing
      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
        updatedItems[index] = {
          ...updatedItems[index],
          [field]: value
        };
      } else {
        return;
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
    }
    
    setEditableData({
      ...editableData,
      receiptInfo: {
        ...editableData.receiptInfo,
        items: updatedItems
      }
    });
  };

  const handleDeleteItem = (index) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const updatedItems = (editableData.receiptInfo?.items || []).filter((_, i) => i !== index);
      
      setEditableData({
        ...editableData,
        receiptInfo: {
          ...editableData.receiptInfo,
          items: updatedItems
        }
      });
    }
  };

  const handleAddItem = () => {
    const newItem = {
      productName: "New Product",
      casualName: "new item",
      price: 0.00,
      quantity: 1,
      unit: "item",
      category: "Other"
    };
    
    setEditableData({
      ...editableData,
      receiptInfo: {
        ...editableData.receiptInfo,
        items: [...(editableData.receiptInfo?.items || []), newItem]
      }
    });
  };

  const handleEditItem = (index) => {
    setEditingItem(index);
    setShowEditModal(true);
  };

  const handleSaveChanges = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setError('');
      setSuccess('Please sign in to save changes permanently');
      
      // Navigate to next page after short delay
      setTimeout(() => {
        if (onUpdateSuccess && typeof onUpdateSuccess === 'function') {
          onUpdateSuccess();
        }
      }, 1500);
      return;
    }

    // Real save for authenticated users
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const calculatedTotal = (editableData.receiptInfo?.items || []).reduce(
        (sum, item) => sum + (parseFloat(item.price) || 0), 
        0
      );
      
      const cleanNumber = (num) => {
        const str = num.toString();
        if (str.includes('.')) {
          return parseFloat(str);
        }
        return num;
      };
      
      const dataToSave = {
        imageName: editableData.imageName,
        receiptInfo: {
          items: (editableData.receiptInfo?.items || []).map(item => ({
            productName: item.productName,
            casualName: item.casualName,
            price: cleanNumber(parseFloat(item.price) || 0),
            quantity: cleanNumber(parseFloat(item.quantity) || 0),
            unit: item.unit,
            category: item.category
          })),
          date: receiptDate,
          calculatedTotal: cleanNumber(parseFloat(calculatedTotal)),
          providedTotal: cleanNumber(parseFloat(calculatedTotal))
        }
      };

      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      };
      
      const response = await axios.post(`${API_BASE_URL}/Receipt/save-as-file`, dataToSave, { headers });
      setSuccess('Receipt saved successfully to your account!');
      
      // Call the callback with a slight delay
      if (onUpdateSuccess && typeof onUpdateSuccess === 'function') {
        setTimeout(() => {
          onUpdateSuccess(response.data);
        }, 500);
      }
    } catch (err) {
      console.error('Error updating receipt:', err);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please sign in again.');
      } else if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment and try again.');
      } else {
        setError(`Failed to update receipt: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const currentTotal = (editableData.receiptInfo?.items || []).reduce(
    (sum, item) => {
      const price = typeof item.price === 'string' ? parseFloat(item.price) || 0 : item.price || 0;
      return sum + price;
    }, 
    0
  ).toFixed(2);

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Mobile Item Card Component
  const ItemCard = ({ item, index }) => (
    <Card className="item-card mb-3 shadow-sm">
      <Card.Body className="p-3">
        <Row className="align-items-center">
          <Col xs={8}>
            <div className="item-details">
              <h6 className="mb-1 item-name">{item.productName}</h6>
              <small className="text-muted d-block mb-2">{item.casualName}</small>
              <div className="item-meta">
                <Badge bg="secondary" className="me-2">{item.category}</Badge>
                <span className="text-muted me-2">
                  {item.quantity} {item.unit}
                </span>
                <span className="fw-bold text-success">
                  {formatCurrency(item.price)}
                </span>
              </div>
            </div>
          </Col>
          <Col xs={4} className="text-end">
            <div className="item-actions">
              <Button 
                variant="outline-primary" 
                size="sm"
                className="me-1 mb-1"
                onClick={() => handleEditItem(index)}
              >
                Edit
              </Button>
              <Button 
                variant="outline-danger" 
                size="sm"
                className="mb-1"
                onClick={() => handleDeleteItem(index)}
              >
                Delete
              </Button>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <Card className="receipt-edit-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Receipt Details</h4>
          <div className="d-flex gap-2 align-items-center">
            <Badge bg="info">{(editableData.receiptInfo?.items || []).length} items</Badge>
          </div>
        </Card.Header>
        
        <Card.Body className="p-3">
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
          
          {/* Receipt Summary */}
          <Row className="g-3 mb-4">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold">Receipt Date</Form.Label>
                <Form.Control
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="form-control-lg"
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold">Receipt Total</Form.Label>
                <Form.Control
                  type="text"
                  value={formatCurrency(currentTotal)}
                  readOnly
                  className="form-control-lg fw-bold text-success"
                />
              </Form.Group>
            </Col>
          </Row>
          
          {/* Items Section */}
          <div className="items-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">Items ({(editableData.receiptInfo?.items || []).length})</h5>
              <Button 
                variant="success" 
                size="sm"
                onClick={handleAddItem}
              >
                + Add Item
              </Button>
            </div>
            
            {/* Mobile Card View */}
            {viewMode === 'cards' && (
              <div className="items-cards-container">
                {(editableData.receiptInfo?.items || []).length === 0 ? (
                  <Card className="text-center py-4">
                    <Card.Body>
                      <p className="mb-0 text-muted">
                        No items found. Add some items to get started.
                      </p>
                    </Card.Body>
                  </Card>
                ) : (
                  (editableData.receiptInfo?.items || []).map((item, index) => (
                    <ItemCard key={index} item={item} index={index} />
                  ))
                )}
              </div>
            )}
            
            {/* Desktop Table View */}
            {viewMode === 'table' && (
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Price ($)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editableData.receiptInfo?.items || []).map((item, index) => (
                      <tr key={index}>
                        <td>
                          <Form.Control
                            type="text"
                            value={item.productName}
                            onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          />
                          <Form.Control
                            type="text"
                            value={item.casualName}
                            onChange={(e) => handleItemChange(index, 'casualName', e.target.value)}
                            placeholder="Simple name"
                            className="mt-1"
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            value={item.category}
                            onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                            placeholder="Enter category"
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          />
                        </td>
                        <td>
                          <InputGroup>
                            <InputGroup.Text>$</InputGroup.Text>
                            <Form.Control
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                            />
                          </InputGroup>
                        </td>
                        <td>
                          <Button 
                            variant="danger" 
                            size="sm"
                            onClick={() => handleDeleteItem(index)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
            <Button 
              variant="primary" 
              size="lg"
              onClick={handleSaveChanges}
              disabled={saving}
              className="px-4"
            >
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Mobile Edit Item Modal */}
      <Modal 
        show={showEditModal} 
        onHide={() => setShowEditModal(false)}
        size="lg"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Edit Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingItem !== null && (editableData.receiptInfo?.items || [])[editingItem] && (
            <Form>
              <Row className="g-3">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-bold">Product Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={editableData.receiptInfo.items?.[editingItem]?.productName || ''}
                      onChange={(e) => handleItemChange(editingItem, 'productName', e.target.value)}
                      className="form-control-lg"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-bold">Simple Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={editableData.receiptInfo.items?.[editingItem]?.casualName || ''}
                      onChange={(e) => handleItemChange(editingItem, 'casualName', e.target.value)}
                      placeholder="Simple name"
                      className="form-control-lg"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-bold">Category</Form.Label>
                    <Form.Control
                      type="text"
                      value={editableData.receiptInfo.items?.[editingItem]?.category || ''}
                      onChange={(e) => handleItemChange(editingItem, 'category', e.target.value)}
                      placeholder="Enter category"
                      className="form-control-lg"
                    />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold">Quantity</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={editableData.receiptInfo.items?.[editingItem]?.quantity || ''}
                      onChange={(e) => handleItemChange(editingItem, 'quantity', e.target.value)}
                      className="form-control-lg"
                    />
                  </Form.Group>
                </Col>
                <Col xs={6}>
                  <Form.Group>
                    <Form.Label className="fw-bold">Unit</Form.Label>
                    <Form.Control
                      type="text"
                      value={editableData.receiptInfo.items?.[editingItem]?.unit || ''}
                      onChange={(e) => handleItemChange(editingItem, 'unit', e.target.value)}
                      className="form-control-lg"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-bold">Price</Form.Label>
                    <InputGroup size="lg">
                      <InputGroup.Text>$</InputGroup.Text>
                      <Form.Control
                        type="number"
                        step="0.01"
                        value={editableData.receiptInfo.items?.[editingItem]?.price || ''}
                        onChange={(e) => handleItemChange(editingItem, 'price', e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Close
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              handleDeleteItem(editingItem);
              setShowEditModal(false);
            }}
          >
            Delete Item
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Custom Styles */}
      <style jsx>{`
        .receipt-edit-card {
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .item-card {
          border: 1px solid #e9ecef;
          transition: all 0.2s ease;
        }
        
        .item-card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }
        
        .item-name {
          font-size: 1rem;
          font-weight: 600;
          color: #212529;
          line-height: 1.2;
        }
        
        .item-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        @media (max-width: 767.98px) {
          .form-control,
          .form-select {
            font-size: 16px;
            min-height: 44px;
          }
          
          .form-control-lg {
            min-height: 48px;
            font-size: 16px;
          }
          
          .btn {
            min-height: 44px;
            font-size: 16px;
          }
          
          .btn-sm {
            min-height: 38px;
            font-size: 14px;
            padding: 0.375rem 0.75rem;
          }
          
          .item-actions .btn {
            min-width: 60px;
          }
          
          .badge {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </>
  );
};

export default JsonDisplay;
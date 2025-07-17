import React, { useState, useEffect } from 'react';
import { 
  Card, Table, Form, Button, Row, Col, InputGroup, 
  Modal, Badge, Alert 
} from 'react-bootstrap';
import axios from 'axios';
import './ReceiptHistory.css';

const REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const JsonDisplay = ({ 
  receiptData, 
  onUpdateSuccess,
  isAuthenticated = false
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
  
  // New state for tracking edited items
  const [editedItems, setEditedItems] = useState(new Set());
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    if (receiptData) {
      console.log('JsonDisplay received receiptData:', receiptData);
      console.log('Items array:', receiptData.receiptInfo?.items);
      
      const processedData = {
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
      };
      
      setEditableData(processedData);
      // Store original data for comparison
      setOriginalData(JSON.parse(JSON.stringify(processedData)));
      
      const currentDate = new Date().toISOString().split('T')[0];
      setReceiptDate(receiptData.receiptInfo?.Date || receiptData.receiptInfo?.date || currentDate);
      
      // Reset edited items tracking
      setEditedItems(new Set());
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

  // Check if an item has been edited compared to original
  const isItemEdited = (index) => {
    if (!originalData || !originalData.receiptInfo?.items || !editableData.receiptInfo?.items) return false;
    
    const originalItem = originalData.receiptInfo.items[index];
    const currentItem = editableData.receiptInfo.items[index];
    
    if (!originalItem || !currentItem) return false;
    
    return JSON.stringify(originalItem) !== JSON.stringify(currentItem);
  };

  // Mark item as edited
  const markItemAsEdited = (index) => {
    setEditedItems(prev => new Set([...prev, index]));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...(editableData.receiptInfo?.items || [])];
    
    if (field === 'price' || field === 'quantity') {
      // Allow negative values, empty string, decimal points, and numbers
      if (value === '' || value === '.' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
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

    // Mark item as edited
    markItemAsEdited(index);
  };

  // Move item up
  const moveItemUp = (index) => {
    if (index <= 0) return;
    
    const updatedItems = [...(editableData.receiptInfo?.items || [])];
    [updatedItems[index - 1], updatedItems[index]] = [updatedItems[index], updatedItems[index - 1]];
    
    setEditableData({
      ...editableData,
      receiptInfo: {
        ...editableData.receiptInfo,
        items: updatedItems
      }
    });

    // Update edited items tracking after move
    const newEditedItems = new Set();
    editedItems.forEach(editedIndex => {
      if (editedIndex === index) {
        newEditedItems.add(index - 1);
      } else if (editedIndex === index - 1) {
        newEditedItems.add(index);
      } else {
        newEditedItems.add(editedIndex);
      }
    });
    setEditedItems(newEditedItems);
  };

  // Move item down
  const moveItemDown = (index) => {
    const items = editableData.receiptInfo?.items || [];
    if (index >= items.length - 1) return;
    
    const updatedItems = [...items];
    [updatedItems[index], updatedItems[index + 1]] = [updatedItems[index + 1], updatedItems[index]];
    
    setEditableData({
      ...editableData,
      receiptInfo: {
        ...editableData.receiptInfo,
        items: updatedItems
      }
    });

    // Update edited items tracking after move
    const newEditedItems = new Set();
    editedItems.forEach(editedIndex => {
      if (editedIndex === index) {
        newEditedItems.add(index + 1);
      } else if (editedIndex === index + 1) {
        newEditedItems.add(index);
      } else {
        newEditedItems.add(editedIndex);
      }
    });
    setEditedItems(newEditedItems);
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

      // Update edited items tracking after deletion
      const newEditedItems = new Set();
      editedItems.forEach(editedIndex => {
        if (editedIndex < index) {
          newEditedItems.add(editedIndex);
        } else if (editedIndex > index) {
          newEditedItems.add(editedIndex - 1);
        }
        // Items at the deleted index are removed from tracking
      });
      setEditedItems(newEditedItems);
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
    
    const currentItems = editableData.receiptInfo?.items || [];
    const newIndex = currentItems.length;
    
    setEditableData({
      ...editableData,
      receiptInfo: {
        ...editableData.receiptInfo,
        items: [...currentItems, newItem]
      }
    });

    // Mark new item as edited
    markItemAsEdited(newIndex);
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
        'Content-Type': 'application/json'
      };
      
      const response = await axios.post(`${REACT_APP_API_BASE_URL}/Receipt/save-as-file`, dataToSave, { headers });
      setSuccess('Receipt saved successfully to your account!');
      
      // Reset edited items tracking after successful save
      setEditedItems(new Set());
      setOriginalData(JSON.parse(JSON.stringify(editableData)));
      
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
    const num = parseFloat(amount || 0);
    const sign = num < 0 ? '-' : '';
    return `${sign}$${Math.abs(num).toFixed(2)}`;
  };

  // Mobile Item Card Component
  const ItemCard = ({ item, index }) => {
    const itemEdited = isItemEdited(index) || editedItems.has(index);
    
    return (
      <Card className={`item-card mb-3 shadow-sm ${itemEdited ? 'border-warning' : ''}`}>
        {itemEdited && (
          <div className="edited-badge">
            <Badge bg="warning" text="dark" className="position-absolute" style={{ top: '-8px', right: '8px', zIndex: 1 }}>
              EDITED
            </Badge>
          </div>
        )}
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
                  <span className={`fw-bold ${parseFloat(item.price) < 0 ? 'text-danger' : 'text-success'}`}>
                    {formatCurrency(item.price)}
                  </span>
                </div>
              </div>
            </Col>
            <Col xs={4} className="text-end">
              <div className="item-actions">
                {/* Move buttons */}
                <div className="move-buttons mb-2">
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    className="me-1 p-1"
                    onClick={() => moveItemUp(index)}
                    disabled={index === 0}
                    title="Move Up"
                  >
                    ↑
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    className="p-1"
                    onClick={() => moveItemDown(index)}
                    disabled={index === (editableData.receiptInfo?.items || []).length - 1}
                    title="Move Down"
                  >
                    ↓
                  </Button>
                </div>
                
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
  };

  return (
    <>
      <Card className="receipt-edit-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Receipt Details</h4>
          <div className="d-flex gap-2 align-items-center">
            <Badge bg="info">{(editableData.receiptInfo?.items || []).length} items</Badge>
            {editedItems.size > 0 && (
              <Badge bg="warning" text="dark">{editedItems.size} edited</Badge>
            )}
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
                  className={`form-control-lg fw-bold ${parseFloat(currentTotal) < 0 ? 'text-danger' : 'text-success'}`}
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
                      <th style={{ width: '80px' }}>Move</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Quantity</th>
                      <th>Unit</th>
                      <th>Price ($)</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editableData.receiptInfo?.items || []).map((item, index) => {
                      const itemEdited = isItemEdited(index) || editedItems.has(index);
                      
                      return (
                        <tr key={index} className={itemEdited ? 'table-warning' : ''}>
                          <td className="text-center">
                            {itemEdited && (
                              <Badge bg="warning" text="dark" className="d-block mb-1" style={{ fontSize: '0.7em' }}>
                                EDITED
                              </Badge>
                            )}
                            <div className="btn-group-vertical" role="group">
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => moveItemUp(index)}
                                disabled={index === 0}
                                title="Move Up"
                                className="py-0 px-1"
                              >
                                ↑
                              </Button>
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => moveItemDown(index)}
                                disabled={index === (editableData.receiptInfo?.items || []).length - 1}
                                title="Move Down"
                                className="py-0 px-1"
                              >
                                ↓
                              </Button>
                            </div>
                          </td>
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
                              type="text"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              placeholder="Can be negative"
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
                                type="text"
                                value={item.price}
                                onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                placeholder="Can be negative"
                                className={parseFloat(item.price) < 0 ? 'text-danger' : ''}
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
                      );
                    })}
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
                      type="text"
                      value={editableData.receiptInfo.items?.[editingItem]?.quantity || ''}
                      onChange={(e) => handleItemChange(editingItem, 'quantity', e.target.value)}
                      className="form-control-lg"
                      placeholder="Can be negative"
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
                        type="text"
                        value={editableData.receiptInfo.items?.[editingItem]?.price || ''}
                        onChange={(e) => handleItemChange(editingItem, 'price', e.target.value)}
                        placeholder="Can be negative (e.g., -5.99)"
                        className={parseFloat(editableData.receiptInfo.items?.[editingItem]?.price) < 0 ? 'text-danger' : ''}
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
      
      {/* Receipt Image Section */}
      <div className="receipt-image-section mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Original Receipt</h5>
          <Badge bg="secondary" className="text-uppercase">Reference</Badge>
        </div>
        
        <Card className="receipt-image-card">
          <Card.Body className="p-3">
            {editableData.imageName ? (
              <div className="receipt-image-container">
                <img
                  src={`${REACT_APP_API_BASE_URL}/Receipt/image/${editableData.imageName}`}
                  alt="Original Receipt"
                  className="receipt-image"
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
            ) : (
              <div className="image-placeholder d-flex align-items-center justify-content-center bg-light text-muted p-4">
                <div className="text-center">
                  <i className="fas fa-image fa-2x mb-2"></i>
                  <br />
                  No receipt image available
                </div>
              </div>
            )}
            
            {/* Image info */}
            {editableData.imageName && (
              <div className="receipt-image-info mt-3 pt-3" style={{ borderTop: '1px solid #dee2e6' }}>
                <Row className="text-muted small">
                  <Col xs={12} md={6}>
                    <strong>Image ID:</strong> {editableData.imageName}
                  </Col>
                  <Col xs={12} md={6}>
                    <strong>Filename:</strong> {editableData.displayName || 'N/A'}
                  </Col>
                </Row>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </>
  );
};

export default JsonDisplay;
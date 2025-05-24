import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Button, Row, Col, InputGroup } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = "https://receiptscannerbackend.onrender.com/api";

// Add onUpdateSuccess to the props
const JsonDisplay = ({ receiptData, onUpdateSuccess }) => {
  const [editableData, setEditableData] = useState(null);
  const [receiptDate, setReceiptDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (receiptData) {
      // Create a deep copy to avoid modifying the original data
      setEditableData({
        ...receiptData,
        receiptInfo: {
          ...receiptData.receiptInfo
        }
      });
      
      // Set the date (use current date if not provided)
        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        setReceiptDate(receiptData.receiptInfo.date || currentDate);
    }
  }, [receiptData]);

  if (!editableData) {
    return <p>No receipt data to display.</p>;
  }

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editableData.receiptInfo.items];
    
    // Handle numeric fields
    if (field === 'price' || field === 'quantity') {
      value = parseFloat(value) || 0;
    }
    
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    setEditableData({
      ...editableData,
      receiptInfo: {
        ...editableData.receiptInfo,
        items: updatedItems
      }
    });
  };

  const handleDeleteItem = (index) => {
    const updatedItems = editableData.receiptInfo.items.filter((_, i) => i !== index);
    
    setEditableData({
      ...editableData,
      receiptInfo: {
        ...editableData.receiptInfo,
        items: updatedItems
      }
    });
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
        items: [...editableData.receiptInfo.items, newItem]
      }
    });
  };

const handleSaveChanges = async () => {
  try {
    setSaving(true);
    setError('');
    setSuccess('');
    
    // Update the total amount based on items
    const calculatedTotal = editableData.receiptInfo.items.reduce(
      (sum, item) => sum + (item.price || 0), 
      0
    );
    
    // Define the helper function for cleaning numbers
    const cleanNumber = (num) => {
      const str = num.toString();
      if (str.includes('.')) {
        return parseFloat(str);
      }
      return num;
    };
    
    // Create the final data to save
// In JsonDisplay.js - handleSaveChanges function
const dataToSave = {
  imageName: editableData.imageName,
  receiptInfo: {
    items: editableData.receiptInfo.items.map(item => ({
      productName: item.productName,
      casualName: item.casualName,
      price: cleanNumber(parseFloat(item.price)),
      quantity: cleanNumber(parseFloat(item.quantity)),
      unit: item.unit,
      category: item.category
    })),
    date: receiptDate,
    calculatedTotal: cleanNumber(parseFloat(calculatedTotal)),
    providedTotal: cleanNumber(parseFloat(calculatedTotal))
  }
};
    
    // Send to the backend using the update endpoint
    const response = await axios.post(`${API_BASE_URL}/Receipt/update`, dataToSave, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    setSuccess('Receipt updated successfully!');
    
    if (onUpdateSuccess && typeof onUpdateSuccess === 'function') {
      onUpdateSuccess(response.data);
    }
  } catch (err) {
    console.error('Error updating receipt:', err);
    setError(`Failed to update receipt: ${err.message}`);
  } finally {
    setSaving(false);
  }
};

  // Calculate the current total
  const currentTotal = editableData.receiptInfo.items.reduce(
    (sum, item) => sum + (item.price || 0), 
    0
  ).toFixed(2);

  const categoryOptions = [
    'Fruits', 'Vegetables', 'Dairy', 'Meat', 
    'Household', 'Snacks', 'Drinks', 'Bakery', 
    'Frozen', 'Other'
  ];

  return (
    <Card>
      <Card.Header>Receipt Details</Card.Header>
      <Card.Body>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        <Row className="mb-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Receipt Date</Form.Label>
              <Form.Control
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Receipt Total</Form.Label>
              <Form.Control
                type="text"
                value={`$${currentTotal}`}
                readOnly
              />
            </Form.Group>
          </Col>
        </Row>
        
        <h5 className="mt-4">Items ({editableData.receiptInfo.items.length})</h5>
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
              {editableData.receiptInfo.items.map((item, index) => (
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
        
        <div className="d-flex justify-content-between mt-3">
          <Button variant="secondary" onClick={handleAddItem}>
            Add Item
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveChanges}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default JsonDisplay;

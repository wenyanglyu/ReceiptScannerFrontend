// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Container } from 'react-bootstrap';
import CategoryPieChart from './CategoryPieChart';
import SpendingTrends from './SpendingTrends';

const Dashboard = () => {
  // Your existing state and hooks
  
  return (
    <Container fluid>
      <h2 className="mb-4">Dashboard</h2>
      
      {/* First Card - Category Pie Chart */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>Spending by Category</Card.Header>
            <Card.Body style={{ height: '500px' }}>
              <CategoryPieChart />
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Second Card - Spending Trends */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>Spending Trends</Card.Header>
            <Card.Body style={{ height: '500px' }}>
              <SpendingTrends />
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
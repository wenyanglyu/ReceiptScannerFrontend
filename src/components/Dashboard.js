// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Container, Button, ButtonGroup } from 'react-bootstrap';
import ItemBubblesChart from './ItemBubblesChart';
import SpendingTrends from './SpendingTrends';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [viewMode, setViewMode] = useState(() => {
    return window.innerWidth >= 768 ? 'split' : 'tabs';
  });

  useEffect(() => {
    // Handle window resize for responsive view switching
    const handleResize = () => {
      const newViewMode = window.innerWidth >= 768 ? 'split' : 'tabs';
      setViewMode(newViewMode);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Container fluid className="dashboard-container">
      {/* Desktop: Stacked view for better chart sizing */}
      {viewMode === 'split' && (
        <>

          {/* Desktop Layout - Stacked vertically for better width */}
          <Row className="g-4">
            {/* Item Bubbles Chart - Full width */}
            <Col xs={12}>
              <Card className="dashboard-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">🫧 Bubbles</h5>
                </Card.Header>
                <Card.Body style={{ minHeight: '500px' }}>
                  <ItemBubblesChart />
                </Card.Body>
              </Card>
            </Col>
            
            {/* Spending Trends - Full width */}
            <Col xs={12}>
              <Card className="dashboard-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">📈 Spending Trends</h5>
                </Card.Header>
                <Card.Body style={{ minHeight: '500px' }}>
                  <SpendingTrends />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* Mobile: Tab view with one chart at a time */}
      {viewMode === 'tabs' && (
        <>
          
          {/* Mobile Tab Navigation */}
          <Card className="dashboard-mobile-card">
            <Card.Header className="p-0">
              <ButtonGroup className="w-100" size="lg">
                <Button
                  variant={activeTab === 'items' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('items')}
                  className="rounded-0 border-0 py-3"
                >
                  🫧 Bubbles
                </Button>
                <Button
                  variant={activeTab === 'trends' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('trends')}
                  className="rounded-0 border-0 py-3"
                >
                  📈 Trends
                </Button>
              </ButtonGroup>
            </Card.Header>
            
            <Card.Body className="p-0">
              {/* Items Tab */}
              {activeTab === 'items' && (
                <div className="mobile-chart-container">
                  <div className="chart-header p-3 bg-light">
                  </div>
                  <div style={{ height: '70vh', padding: '1rem' }}>
                    <ItemBubblesChart />
                  </div>
                </div>
              )}
              
              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <div className="mobile-chart-container">
                  <div className="chart-header p-3 bg-light">
                    <h6 className="mb-0 text-center">Spending Trends</h6>
                  </div>
                  <div style={{ height: '70vh', padding: '1rem' }}>
                    <SpendingTrends />
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </>
      )}

      {/* Custom Styles */}
      <style>{`
        .dashboard-container {
          padding-bottom: 2rem;
        }
        
        .dashboard-card {
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-radius: 0.5rem;
          transition: box-shadow 0.2s ease-in-out;
        }
        
        .dashboard-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .dashboard-mobile-card {
          border: none;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .mobile-chart-container {
          background: white;
        }
        
        .chart-header {
          border-bottom: 1px solid #e9ecef;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        
        /* Mobile optimizations */
        @media (max-width: 767.98px) {
          .dashboard-container {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }
          
          h4 {
            font-size: 1.3rem;
          }
          
          .btn {
            font-size: 0.85rem;
            font-weight: 600;
            padding: 0.75rem 0.5rem;
          }
          
          .btn-group .btn {
            min-height: 50px;
          }
          
          .mobile-chart-container {
            min-height: 75vh;
          }
          
          .chart-header h6 {
            font-size: 1rem;
          }
          
          .chart-header small {
            font-size: 0.8rem;
          }
        }
        
        /* Tablet adjustments */
        @media (min-width: 768px) and (max-width: 991.98px) {
          .dashboard-card .card-body {
            min-height: 400px;
          }
        }
        
        /* Large screen optimizations */
        @media (min-width: 1200px) {
          .dashboard-card .card-body {
            min-height: 600px;
          }
        }
        
        /* Enhanced button styles */
        .btn {
          transition: all 0.2s ease-in-out;
        }
        
        .btn:focus {
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
        }
        
        .btn-group .btn:first-child {
          border-top-right-radius: 0;
          border-bottom-right-radius: 0;
        }
        
        .btn-group .btn:last-child {
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
        
        /* Card header improvements */
        .card-header {
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
          border-bottom: 1px solid #e9ecef;
        }
        
        /* Desktop card header styling */
        @media (min-width: 768px) {
          .dashboard-card .card-header {
            padding: 1.25rem 1.5rem;
          }
          
          .dashboard-card .card-header h5 {
            font-size: 1.2rem;
            font-weight: 600;
          }
          
          .dashboard-card .card-header small {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </Container>
  );
};

export default Dashboard;

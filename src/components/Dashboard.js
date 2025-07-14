// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Container, Button, ButtonGroup } from 'react-bootstrap';
import ItemBubblesChart from './ItemBubblesChart';
import SpendingTrends from './SpendingTrends';
import CategoryPieChart from './CategoryPieChart';

const Dashboard = ({ receiptsData, isAuthenticated, userToken, isDemoMode }) => {
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

  // Process receipts data for analytics components
  const processedData = React.useMemo(() => {
    if (!receiptsData || !Array.isArray(receiptsData)) {
      return {
        totalReceipts: 0,
        totalSpent: 0,
        categories: [],
        items: [],
        trends: []
      };
    }

    let totalSpent = 0;
    const categoryTotals = {};
    const itemStats = {};
    const spendingByDate = {};

    receiptsData.forEach(receipt => {
      const receiptInfo = receipt.receiptInfo;
      if (!receiptInfo) return;

      // Calculate total spending
      const receiptTotal = receiptInfo.ProvidedTotal || receiptInfo.CalculatedTotal || 
                    receiptInfo.providedTotal || receiptInfo.calculatedTotal || 0;
      totalSpent += receiptTotal;

      // Spending by date for trends
      const date = receiptInfo.Date || receiptInfo.date || new Date().toISOString().split('T')[0];
      spendingByDate[date] = (spendingByDate[date] || 0) + receiptTotal;

      // Process items for categories and item stats
      const items = receiptInfo.Items || receiptInfo.items || [];
      if (Array.isArray(items)) {
        items.forEach(item => {
          // Category analysis
          const category = item.Category || item.category || 'Other';
          categoryTotals[category] = (categoryTotals[category] || 0) + (item.Price || item.price || 0);

          // Item frequency analysis
          const itemName = item.CasualName || item.casualName || item.ProductName || item.productName || 'Unknown Item';
          if (!itemStats[itemName]) {
            itemStats[itemName] = {
              name: itemName,
              frequency: 0,
              totalSpent: 0
            };
          }
          itemStats[itemName].frequency++;
          itemStats[itemName].totalSpent += (item.price || 0);
        });
      }
    });

    // Format data for components
    const categories = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100
    }));

    const items = Object.values(itemStats).map(item => ({
      name: item.name,
      frequency: item.frequency,
      totalSpent: Math.round(item.totalSpent * 100) / 100
    }));

    const trends = Object.entries(spendingByDate)
      .map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalReceipts: receiptsData.length,
      totalSpent: Math.round(totalSpent * 100) / 100,
      categories,
      items,
      trends
    };
  }, [receiptsData]);

  return (
    <Container fluid className="dashboard-container">
      {/* Demo Mode Info Banner */}
      {isDemoMode && (
        <Card className="mb-3 border-info">
          <Card.Body className="py-2">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-info">
                <strong>Demo Mode:</strong> Viewing {processedData.totalReceipts} receipts • 
                Total: ${processedData.totalSpent.toFixed(2)}
              </small>
              <small className="text-muted">
                Sign in to see your personal analytics
              </small>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Desktop: Stacked view for better chart sizing */}
      {viewMode === 'split' && (
        <>
          {/* Desktop Layout - Stacked vertically for better width */}
          <Row className="g-4">
            {/* Item Bubbles Chart - Full width */}
            <Col xs={12}>
              <Card className="dashboard-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">🫧 Item Bubbles</h5>
                </Card.Header>
                <Card.Body style={{ minHeight: '500px' }}>
                  <ItemBubblesChart 
                    receiptsData={receiptsData}
                    isAuthenticated={isAuthenticated}
                    isDemoMode={isDemoMode}
                    processedItems={processedData.items}
                  />
                </Card.Body>
              </Card>
            </Col>
            
            {/* Spending Trends - Full width */}
            <Col xs={12}>
              <Card className="dashboard-card">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">📈 Spending Trends</h5>
                  <small className="text-muted">
                    Total: ${processedData.totalSpent.toFixed(2)}
                  </small>
                </Card.Header>
                <Card.Body style={{ minHeight: '500px' }}>
                  <SpendingTrends 
                    receiptsData={receiptsData}
                    isAuthenticated={isAuthenticated}
                    isDemoMode={isDemoMode}
                    processedTrends={processedData.trends}
                  />
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
                <Button
                  variant={activeTab === 'categories' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('categories')}
                  className="rounded-0 border-0 py-3"
                >
                  🥧 Categories
                </Button>
              </ButtonGroup>
            </Card.Header>
            
            <Card.Body className="p-0">
              {/* Items Tab */}
              {activeTab === 'items' && (
                <div className="mobile-chart-container">
                  <div className="chart-header p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Item Popularity</h6>
                      <small className="text-muted">{processedData.items.length} items</small>
                    </div>
                  </div>
                  <div style={{ height: '70vh', padding: '1rem' }}>
                    <ItemBubblesChart 
                      receiptsData={receiptsData}
                      isAuthenticated={isAuthenticated}
                      isDemoMode={isDemoMode}
                      processedItems={processedData.items}
                    />
                  </div>
                </div>
              )}
              
              {/* Trends Tab */}
              {activeTab === 'trends' && (
                <div className="mobile-chart-container">
                  <div className="chart-header p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">Spending Trends</h6>
                      <small className="text-muted">${processedData.totalSpent.toFixed(2)} total</small>
                    </div>
                  </div>
                  <div style={{ height: '70vh', padding: '1rem' }}>
                    <SpendingTrends 
                      receiptsData={receiptsData}
                      isAuthenticated={isAuthenticated}
                      isDemoMode={isDemoMode}
                      processedTrends={processedData.trends}
                    />
                  </div>
                </div>
              )}   
            </Card.Body>
          </Card>
        </>
      )}

      {/* Custom Styles - Preserved from original */}
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
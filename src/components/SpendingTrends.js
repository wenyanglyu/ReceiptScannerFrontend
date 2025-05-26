import React, { useEffect, useState, useMemo } from 'react';

// API base URL - centralize it here
const API_BASE_URL = 'https://localhost:7276/api';

const SpendingTrends = () => {
  const [receiptData, setReceiptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeView, setTimeView] = useState('week'); // 'receipt', 'week', 'month', 'year'
  const [chartType, setChartType] = useState('bar'); // Only 'bar' now
  const [showAverage, setShowAverage] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Fetch all receipt data once
  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        setLoading(true);
        console.log('Fetching receipt data...');
        
        const response = await fetch(`${API_BASE_URL}/Receipt/stats/trends`);
        const data = await response.json();
        const formattedReceipts = data.map(receipt => ({
          id: receipt.id,
          date: new Date(receipt.date),
          amount: parseFloat(receipt.amount || receipt.total || receipt.value || 0),
        }));
        setReceiptData(formattedReceipts);
        setLoading(false);
  
      } catch (err) {
        console.error('Error fetching trends data:', err);
        setError('Failed to load receipt data');
        setLoading(false);
      }
    };

    fetchReceiptData();
  }, []);

  // Handle window resize for responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Process data based on selected view
  const trendsData = useMemo(() => {
    if (!receiptData.length) return [];
    
    const sortedReceipts = [...receiptData].sort((a, b) => a.date - b.date);
    
    switch (timeView) {
      case 'receipt':
        return sortedReceipts.map(receipt => ({
          label: receipt.date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          amount: receipt.amount,
        }));
        
      case 'week': {
        const weeklyData = {};
        
        sortedReceipts.forEach(receipt => {
          const date = receipt.date;
          const year = date.getFullYear();
          const firstDayOfYear = new Date(year, 0, 1);
          const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          const weekKey = `${year}-${weekNum}`;
          
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = {
              year,
              weekNumber: weekNum,
              amount: 0,
              receipts: []
            };
          }
          
          weeklyData[weekKey].amount += receipt.amount;
          weeklyData[weekKey].receipts.push(receipt);
        });
        
        return Object.values(weeklyData).map(week => ({
          label: `Week ${week.weekNumber}`,
          amount: week.amount,
          count: week.receipts.length
        }));
      }
        
      case 'month': {
        const monthlyData = {};
        
        sortedReceipts.forEach(receipt => {
          const date = receipt.date;
          const year = date.getFullYear();
          const month = date.getMonth();
          const monthKey = `${year}-${month}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              year,
              month,
              amount: 0,
              receipts: []
            };
          }
          
          monthlyData[monthKey].amount += receipt.amount;
          monthlyData[monthKey].receipts.push(receipt);
        });
        
        return Object.values(monthlyData).map(month => {
          const date = new Date(month.year, month.month);
          return {
            label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            amount: month.amount,
            count: month.receipts.length
          };
        });
      }
        
      case 'year': {
        const yearlyData = {};
        
        sortedReceipts.forEach(receipt => {
          const year = receipt.date.getFullYear();
          
          if (!yearlyData[year]) {
            yearlyData[year] = {
              year,
              amount: 0,
              receipts: []
            };
          }
          
          yearlyData[year].amount += receipt.amount;
          yearlyData[year].receipts.push(receipt);
        });
        
        return Object.values(yearlyData).map(year => ({
          label: year.year.toString(),
          amount: year.amount,
          count: year.receipts.length
        }));
      }
        
      default:
        return [];
    }
  }, [receiptData, timeView]);
  
  const averageSpending = useMemo(() => {
    if (!trendsData.length) return 0;
    const sum = trendsData.reduce((acc, item) => acc + item.amount, 0);
    return sum / trendsData.length;
  }, [trendsData]);
  
  const highestSpending = useMemo(() => {
    if (!trendsData.length) return { label: '', amount: 0 };
    return trendsData.reduce((max, item) => 
      item.amount > max.amount ? item : max, 
      { label: '', amount: 0 }
    );
  }, [trendsData]);

  const getViewLabel = () => {
    switch(timeView) {
      case 'receipt': return 'Receipt';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
      case 'year': return 'Yearly';
      default: return '';
    }
  };

  // Responsive chart component
  const ResponsiveChart = ({ data, showAvg, avgValue }) => {
    const maxAmount = Math.max(...data.map(d => d.amount));
    
    if (isMobile) {
      // Mobile layout
      return (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '1rem',
          padding: '0.75rem',
          color: 'white',
          height: 'auto',
          minHeight: '320px',
          position: 'relative',
          overflow: 'visible',
          width: '100%'
        }}>
          {/* Chart Title */}
          <div style={{
            fontSize: '1rem',
            fontWeight: '700',
            marginBottom: '0.75rem',
            textAlign: 'center'
          }}>
            {getViewLabel()} Spending Trends
          </div>
          
          {/* Chart Area */}
          <div style={{
            display: 'flex',
            alignItems: 'end',
            height: '180px',
            gap: '2px',
            padding: '0 0.5rem',
            position: 'relative',
            marginTop: '25px'
          }}>
            {/* Average line */}
            {showAvg && (
              <div style={{
                position: 'absolute',
                left: '0.5rem',
                right: '0.5rem',
                top: `${((maxAmount - avgValue) / maxAmount) * 150}px`,
                borderTop: '2px dashed rgba(255,255,255,0.7)',
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.9)'
              }}>
                <span style={{
                  background: 'rgba(0,0,0,0.4)',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  position: 'absolute',
                  right: 0,
                  top: '-10px',
                  fontSize: '0.65rem'
                }}>
                  Avg: ${avgValue.toFixed(0)}
                </span>
              </div>
            )}
            
            {/* Bar Chart */}
            {data.map((item, index) => {
              const height = (item.amount / maxAmount) * 150;
              
              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: `${height}px`,
                    background: `linear-gradient(to top, rgba(255,255,255,0.9), rgba(255,255,255,0.6))`,
                    borderRadius: '3px 3px 0 0',
                    position: 'relative',
                    minWidth: '12px',
                    maxWidth: '35px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Amount label on top of bar */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '1px 3px',
                    borderRadius: '2px',
                    fontSize: '0.6rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }}>
                    ${item.amount.toFixed(0)}
                  </div>
                  
                  {/* Date label below bar for mobile */}
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-45deg)',
                    transformOrigin: 'center top',
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '0.55rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    marginTop: '5px'
                  }}>
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Bottom padding for rotated labels */}
          <div style={{ height: '40px' }} />
        </div>
      );
    } else {
      // Desktop layout
      return (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '1rem',
          padding: '1.5rem',
          color: 'white',
          height: 'auto',
          minHeight: '400px',
          position: 'relative',
          overflow: 'visible',
          width: '100%'
        }}>
          {/* Chart Title */}
          <div style={{
            fontSize: '1.3rem',
            fontWeight: '700',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {getViewLabel()} Spending Trends
          </div>
          
          {/* Chart Area */}
          <div style={{
            display: 'flex',
            alignItems: 'end',
            height: '280px',
            gap: '8px',
            padding: '0 1rem',
            position: 'relative',
            marginTop: '40px'
          }}>
            {/* Average line */}
            {showAvg && (
              <div style={{
                position: 'absolute',
                left: '1rem',
                right: '1rem',
                top: `${((maxAmount - avgValue) / maxAmount) * 240}px`,
                borderTop: '2px dashed rgba(255,255,255,0.7)',
                fontSize: '0.9rem',
                color: 'rgba(255,255,255,0.9)'
              }}>
                <span style={{
                  background: 'rgba(0,0,0,0.4)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  position: 'absolute',
                  right: 0,
                  top: '-15px',
                  fontSize: '0.8rem'
                }}>
                  Average: ${avgValue.toFixed(0)}
                </span>
              </div>
            )}
            
            {/* Bar Chart */}
            {data.map((item, index) => {
              const height = (item.amount / maxAmount) * 240;
              
              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: `${height}px`,
                    background: `linear-gradient(to top, rgba(255,255,255,0.9), rgba(255,255,255,0.6))`,
                    borderRadius: '6px 6px 0 0',
                    position: 'relative',
                    minWidth: '30px',
                    maxWidth: '80px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Amount label on top of bar */}
                  <div style={{
                    position: 'absolute',
                    top: '-35px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                  }}>
                    ${item.amount.toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* X-axis labels for desktop */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '1rem',
            fontSize: '0.85rem',
            opacity: 0.9,
            fontWeight: '600',
            padding: '0 1rem'
          }}>
            {data.map((item, index) => (
              <div key={index} style={{ flex: 1, textAlign: 'center' }}>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '1rem',
        color: 'white'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <p>Loading spending trends...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        background: '#fee',
        border: '1px solid #fcc',
        borderRadius: '1rem',
        color: '#c33',
        textAlign: 'center'
      }}>
        {error}
      </div>
    );
  }
  
  if (receiptData.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        background: '#e6f3ff',
        border: '1px solid #b3d9ff',
        borderRadius: '1rem',
        color: '#0066cc',
        textAlign: 'center'
      }}>
        No receipt data available. Upload some receipts to see spending trends.
      </div>
    );
  }

  return (
    <div style={{
      padding: isMobile ? '0.75rem' : '1.5rem',
      background: '#f8f9fa',
      borderRadius: '1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      maxWidth: '100vw',
      overflow: 'hidden'
    }}>
      {/* Mobile-optimized Time Period Selector */}
      <div style={{ marginBottom: '1rem' }}>
        <h6 style={{ margin: '0 0 0.5rem 0', color: '#495057', fontWeight: '600' }}>
          Time Period
        </h6>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: '0.5rem'
        }}>
          {[
            { value: 'week', label: 'Weekly', icon: '📅' },
            { value: 'month', label: 'Monthly', icon: '🗓️' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeView(option.value)}
              style={{
                padding: isMobile ? '0.75rem' : '1rem',
                border: timeView === option.value ? '2px solid #667eea' : '2px solid #e9ecef',
                borderRadius: '0.75rem',
                background: timeView === option.value ? '#667eea' : 'white',
                color: timeView === option.value ? 'white' : '#495057',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Show Average Toggle */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: '1rem'
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: isMobile ? '0.85rem' : '0.9rem',
          color: '#495057',
          cursor: 'pointer',
          fontWeight: '600'
        }}>
          <input
            type="checkbox"
            checked={showAverage}
            onChange={(e) => setShowAverage(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              accentColor: '#667eea'
            }}
          />
          Show Average
        </label>
      </div>
      
      {/* Key Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #28a745, #20c997)',
          color: 'white',
          padding: isMobile ? '0.75rem' : '1rem',
          borderRadius: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', opacity: 0.9, marginBottom: '0.25rem' }}>
            Average {getViewLabel()}
          </div>
          <div style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '700' }}>
            ${averageSpending.toFixed(2)}
          </div>
        </div>
        
        <div style={{
          background: 'linear-gradient(135deg, #fd7e14, #e83e8c)',
          color: 'white',
          padding: isMobile ? '0.75rem' : '1rem',
          borderRadius: '1rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: isMobile ? '0.75rem' : '0.8rem', opacity: 0.9, marginBottom: '0.25rem' }}>
            Highest Period
          </div>
          <div style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '700' }}>
            ${highestSpending.amount.toFixed(2)}
          </div>
          <div style={{ fontSize: isMobile ? '0.65rem' : '0.7rem', opacity: 0.8 }}>
            {highestSpending.label}
          </div>
        </div>
      </div>
      
      {/* Chart */}
      <ResponsiveChart 
        data={trendsData}
        showAvg={showAverage}
        avgValue={averageSpending}
      />
      
      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .tooltip:hover {
          opacity: 1 !important;
        }
        
        @media (hover: none) {
          .tooltip:active {
            opacity: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SpendingTrends;
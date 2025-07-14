import React, { useEffect, useState, useMemo } from 'react';

// API base URL - centralize it here
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const SpendingTrends = ({
  receiptsData = [],
  isAuthenticated = false,
  userToken = null,
  isDemoMode = true,
  processedTrends = null
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeView, setTimeView] = useState('week'); // 'receipt', 'week', 'month', 'year'
  const [chartType, setChartType] = useState('bar'); // Only 'bar' now
  const [showAverage, setShowAverage] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [receiptData, setReceiptData] = useState([]);

  console.log('[SPENDING_TRENDS] Received props:', {
    receiptsDataLength: receiptsData?.length || 0,
    isAuthenticated,
    isDemoMode,
    hasProcessedTrends: !!processedTrends,
    hasUserToken: !!userToken
  });

  // Process data based on mode (demo vs authenticated)
  useEffect(() => {
    const processData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (receiptsData && receiptsData.length > 0) {
          // Use demo/anonymous data directly
          console.log('[SPENDING_TRENDS] Processing demo data:', receiptsData.length, 'receipts');
          
          // Use pre-processed trends if available, otherwise calculate from receipts
          if (processedTrends && processedTrends.length > 0) {
            console.log('[SPENDING_TRENDS] Using pre-processed trends:', processedTrends.length);
            const formattedTrends = processedTrends.map(trend => ({
              id: trend.id || Math.random().toString(),
              date: new Date(trend.date),
              amount: parseFloat(trend.amount || trend.value || 0),
              isDemo: trend.isDemo || false,
              isAnonymous: trend.isAnonymous || false
            }));
            setReceiptData(formattedTrends);
          } else {
            console.log('[SPENDING_TRENDS] Calculating trends from receipts...');
            
            // Transform receipts data to trends format
            const formattedReceipts = receiptsData.map(receipt => {
              const receiptInfo = receipt.receiptInfo;
              const date = new Date(receiptInfo?.Date || receiptInfo?.date || Date.now());
              const amount = parseFloat(
                receiptInfo?.CalculatedTotal || 
                receiptInfo?.calculatedTotal || 
                receiptInfo?.ProvidedTotal || 
                receiptInfo?.providedTotal || 
                0
              );

              return {
                id: receipt.imageName || Math.random().toString(),
                date: date,
                amount: amount,
                isDemo: !isAuthenticated, // All data is "demo" when not authenticated
                isAnonymous: false,
                vendor: receiptInfo?.StoreName || receiptInfo?.storeName || 'Unknown'
              };
            }).filter(item => item.amount > 0); // Filter out zero amounts

            console.log('[SPENDING_TRENDS] Calculated trends:', formattedReceipts.length, 'items');
            setReceiptData(formattedReceipts);
          }
          
          setLoading(false);
        } 
        else {
          // No data available
          console.log('[SPENDING_TRENDS] No data available');
          setReceiptData([]);
          setLoading(false);
        }

      } catch (err) {
        console.error('[SPENDING_TRENDS] Error processing data:', err);
        setError(`Failed to load spending trends: ${err.message}`);
        setLoading(false);
      }
    };

    processData();
  }, [receiptsData, isAuthenticated, isDemoMode, processedTrends, userToken]);

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
          vendor: receipt.vendor,
          isDemo: receipt.isDemo,
          isAnonymous: receipt.isAnonymous
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
              receipts: [],
              demoCount: 0,
              anonymousCount: 0
            };
          }
          
          weeklyData[weekKey].amount += receipt.amount;
          weeklyData[weekKey].receipts.push(receipt);
          if (receipt.isDemo) weeklyData[weekKey].demoCount++;
          if (receipt.isAnonymous) weeklyData[weekKey].anonymousCount++;
        });
        
        return Object.values(weeklyData).map(week => ({
          label: `Week ${week.weekNumber}`,
          amount: week.amount,
          count: week.receipts.length,
          demoCount: week.demoCount,
          anonymousCount: week.anonymousCount,
          isDemo: week.demoCount > 0,
          isAnonymous: week.anonymousCount > 0
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
              receipts: [],
              demoCount: 0,
              anonymousCount: 0
            };
          }
          
          monthlyData[monthKey].amount += receipt.amount;
          monthlyData[monthKey].receipts.push(receipt);
          if (receipt.isDemo) monthlyData[monthKey].demoCount++;
          if (receipt.isAnonymous) monthlyData[monthKey].anonymousCount++;
        });
        
        return Object.values(monthlyData).map(month => {
          const date = new Date(month.year, month.month);
          return {
            label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            amount: month.amount,
            count: month.receipts.length,
            demoCount: month.demoCount,
            anonymousCount: month.anonymousCount,
            isDemo: month.demoCount > 0,
            isAnonymous: month.anonymousCount > 0
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
              receipts: [],
              demoCount: 0,
              anonymousCount: 0
            };
          }
          
          yearlyData[year].amount += receipt.amount;
          yearlyData[year].receipts.push(receipt);
          if (receipt.isDemo) yearlyData[year].demoCount++;
          if (receipt.isAnonymous) yearlyData[year].anonymousCount++;
        });
        
        return Object.values(yearlyData).map(year => ({
          label: year.year.toString(),
          amount: year.amount,
          count: year.receipts.length,
          demoCount: year.demoCount,
          anonymousCount: year.anonymousCount,
          isDemo: year.demoCount > 0,
          isAnonymous: year.anonymousCount > 0
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

  // Calculate data summary for demo mode
  const getDataSummary = () => {
    if (!receiptData.length) return { total: 0, demo: 0, anonymous: 0, saved: 0 };
    
    return {
      total: receiptData.length,
      demo: receiptData.filter(r => r.isDemo).length,
      anonymous: receiptData.filter(r => r.isAnonymous && !r.isDemo).length,
      saved: receiptData.filter(r => !r.isDemo && !r.isAnonymous).length
    };
  };

  const getViewLabel = () => {
    switch(timeView) {
      case 'receipt': return 'Receipt';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
      case 'year': return 'Yearly';
      default: return '';
    }
  };

  // Get bar color based on data source
  const getBarColor = (item, alpha = 0.9) => {
    if (item.isDemo && item.isAnonymous) return `rgba(23, 162, 184, ${alpha})`; // Mixed: teal
    if (item.isDemo) return `rgba(108, 117, 125, ${alpha})`; // Demo: gray
    if (item.isAnonymous) return `rgba(255, 193, 7, ${alpha})`; // Anonymous: yellow
    return `rgba(255, 255, 255, ${alpha})`; // Authenticated: white
  };

  // Responsive chart component
  const ResponsiveChart = ({ data, showAvg, avgValue }) => {
    const maxAmount = Math.max(...data.map(d => d.amount));
    const dataSummary = getDataSummary();
    
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
          {/* Chart Title with Data Source Indicator */}
          <div style={{
            fontSize: '1rem',
            fontWeight: '700',
            marginBottom: '0.75rem',
            textAlign: 'center'
          }}>
            {getViewLabel()} Spending Trends
            {isDemoMode && (
              <div style={{ fontSize: '0.7rem', fontWeight: '500', opacity: 0.9 }}>
                {dataSummary.demo > 0 && `${dataSummary.demo} demo`}
                {dataSummary.anonymous > 0 && ` • ${dataSummary.anonymous} anonymous`}
                {dataSummary.saved > 0 && ` • ${dataSummary.saved} saved`}
              </div>
            )}
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
            {showAvg && avgValue > 0 && (
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
              const height = Math.max((item.amount / maxAmount) * 150, 2); // Minimum height of 2px
              
              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: `${height}px`,
                    background: `linear-gradient(to top, ${getBarColor(item, 0.9)}, ${getBarColor(item, 0.6)})`,
                    borderRadius: '3px 3px 0 0',
                    position: 'relative',
                    minWidth: '12px',
                    maxWidth: '35px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: item.isDemo ? '1px solid rgba(255,255,255,0.3)' : 'none'
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Data source indicator */}
                  {isDemoMode && (item.isDemo || item.isAnonymous) && (
                    <div style={{
                      position: 'absolute',
                      top: '-25px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: item.isDemo ? '#6c757d' : '#ffc107'
                    }} />
                  )}
                  
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
          {/* Chart Title with Data Source Indicator */}
          <div style={{
            fontSize: '1.3rem',
            fontWeight: '700',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {getViewLabel()} Spending Trends
            {isDemoMode && (
              <div style={{ fontSize: '0.8rem', fontWeight: '500', opacity: 0.9, marginTop: '0.25rem' }}>
                {dataSummary.demo > 0 && `${dataSummary.demo} demo receipts`}
                {dataSummary.anonymous > 0 && ` • ${dataSummary.anonymous} anonymous`}
                {dataSummary.saved > 0 && ` • ${dataSummary.saved} saved`}
              </div>
            )}
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
            {showAvg && avgValue > 0 && (
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
              const height = Math.max((item.amount / maxAmount) * 240, 4); // Minimum height of 4px
              
              return (
                <div
                  key={index}
                  style={{
                    flex: 1,
                    height: `${height}px`,
                    background: `linear-gradient(to top, ${getBarColor(item, 0.9)}, ${getBarColor(item, 0.6)})`,
                    borderRadius: '6px 6px 0 0',
                    position: 'relative',
                    minWidth: '30px',
                    maxWidth: '80px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: item.isDemo ? '2px solid rgba(255,255,255,0.3)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {/* Data source indicator */}
                  {isDemoMode && (item.isDemo || item.isAnonymous) && (
                    <div style={{
                      position: 'absolute',
                      top: '-40px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontWeight: '600',
                      background: item.isDemo ? '#6c757d' : '#ffc107',
                      color: item.isDemo ? 'white' : 'black'
                    }}>
                      {item.isDemo ? 'Demo' : 'Anonymous'}
                    </div>
                  )}
                  
                  {/* Amount label on top of bar */}
                  <div style={{
                    position: 'absolute',
                    top: isDemoMode && (item.isDemo || item.isAnonymous) ? '-55px' : '-35px',
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
        {isDemoMode && (
          <small style={{ opacity: 0.8 }}>
            {isAuthenticated ? 'Loading your data...' : 'Processing demo data...'}
          </small>
        )}
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
        <h6>Error Loading Spending Trends</h6>
        <p>{error}</p>
        {!isDemoMode && (
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1rem',
              background: '#c33',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  
  const dataSummary = getDataSummary();

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
            { value: 'month', label: 'Monthly', icon: '🗓️' },
            { value: 'year', label: 'Yearly', icon: '📊' },
            { value: 'receipt', label: 'Per Receipt', icon: '🧾' }
          ].slice(0, isMobile ? 2 : 4).map((option) => (
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
          {isDemoMode && (
            <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '0.25rem' }}>
              {dataSummary.total} data points
            </div>
          )}
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
      
      {/* Data Source Legend for Demo Mode */}
      {isDemoMode && (dataSummary.demo > 0 || dataSummary.anonymous > 0) && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '0.5rem',
          fontSize: '0.8rem'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Data Sources:</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {dataSummary.demo > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  background: '#6c757d',
                  borderRadius: '2px',
                  border: '1px solid rgba(255,255,255,0.3)'
                }} />
                <span>Demo Data</span>
              </div>
            )}
            {dataSummary.anonymous > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  background: '#ffc107',
                  borderRadius: '2px'
                }} />
                <span>Your Uploads</span>
              </div>
            )}
            {dataSummary.saved > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  background: '#fff',
                  borderRadius: '2px',
                  border: '1px solid #ccc'
                }} />
                <span>Saved Receipts</span>
              </div>
            )}
          </div>
        </div>
      )}
      
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
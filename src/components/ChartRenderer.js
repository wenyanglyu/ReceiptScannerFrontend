// src/components/ChartRenderer.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
         BarChart, Bar, ReferenceLine } from 'recharts';

const ChartRenderer = ({ 
  trendsData, 
  chartType, 
  timeView, 
  showAverage, 
  averageSpending, 
  getViewLabel,
  isDemoMode = false,
  isAuthenticated = false,
  dataSource = 'mixed' // 'demo', 'anonymous', 'authenticated', 'mixed'
}) => {
  
  console.log('[CHART] ChartRenderer received data:', {
    dataLength: trendsData?.length || 0,
    chartType,
    timeView,
    isDemoMode,
    isAuthenticated,
    dataSource
  });
  
  if (!trendsData || !trendsData.length) {
    console.log('[CHART] No data available for chart');
    return (
      <div className="d-flex justify-content-center align-items-center flex-column" style={{ height: '100%' }}>
        <div className="text-center text-muted">
          <h6>No Spending Data Available</h6>
          <p className="mb-0">
            {isDemoMode 
              ? "Upload receipts to see spending trends over time" 
              : isAuthenticated 
                ? "Upload some receipts to see your spending trends"
                : "Demo data will show spending trends here"
            }
          </p>
        </div>
      </div>
    );
  }
  
  // Dynamically calculate Y axis range to better fill the space
  const values = trendsData.map(item => item.amount);
  console.log('[CHART] Amount values:', values);
  
  const minValue = 0; // Start from 0 for better readability
  const maxValue = Math.max(...values) * 1.1; // Add 10% headroom
  
  console.log('[CHART] Y-axis range:', minValue, 'to', maxValue);
  
  const commonProps = {
    data: trendsData,
    margin: { top: 20, right: 30, left: 20, bottom: 60 }, // Increased margins for better spacing
  };
  
  // Custom tooltip content with demo mode awareness
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isAnonymousData = data.isAnonymous;
      const isDemoData = data.isDemo;
      
      return (
        <div className="custom-tooltip" style={{ 
          backgroundColor: '#fff', 
          padding: '12px', 
          border: '1px solid #ccc', 
          borderRadius: '8px', 
          boxShadow: '0 4px 8px rgba(0,0,0,0.15)' 
        }}>
          <p className="label mb-1" style={{ fontWeight: 'bold', margin: '0 0 8px 0' }}>
            {label}
            {isDemoData && <span className="badge bg-info ms-2" style={{ fontSize: '0.7em' }}>Demo</span>}
            {isAnonymousData && <span className="badge bg-warning ms-2" style={{ fontSize: '0.7em' }}>Anonymous</span>}
          </p>
          <p className="amount mb-1" style={{ color: '#8884d8', margin: '0 0 4px 0' }}>
            Amount: ${payload[0].value.toFixed(2)}
          </p>
          {timeView === 'receipt' && data.vendor && (
            <p className="vendor mb-0" style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
              Vendor: {data.vendor}
            </p>
          )}
          {timeView !== 'receipt' && data.count && (
            <p className="count mb-0" style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
              Receipts: {data.count}
            </p>
          )}
          {isDemoMode && dataSource === 'mixed' && (
            <p className="source mb-0" style={{ margin: '4px 0 0 0', fontSize: '0.8em', color: '#888' }}>
              {isDemoData && isAnonymousData ? 'Demo + Your uploads' : 
               isDemoData ? 'Demo data' : 
               isAnonymousData ? 'Your upload' : 'Your data'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };
  
  // Common axis configurations
  const xAxisConfig = {
    dataKey: "label",
    height: 60,
    angle: timeView === 'receipt' ? -45 : 0,
    textAnchor: timeView === 'receipt' ? 'end' : 'middle',
    tick: { fontSize: 11 },
    interval: timeView === 'receipt' && trendsData.length > 15 ? 
      Math.floor(trendsData.length / 15) : 0
  };
  
  const yAxisConfig = {
    domain: [minValue, maxValue],
    tick: { fontSize: 11 }
  };

  // Data source indicator
  const DataSourceIndicator = () => {
    if (!isDemoMode) return null;
    
    const demoCount = trendsData.filter(d => d.isDemo).length;
    const anonymousCount = trendsData.filter(d => d.isAnonymous).length;
    const authenticatedCount = trendsData.length - demoCount - anonymousCount;
    
    return (
      <div className="position-absolute" style={{ top: 5, right: 5, zIndex: 10 }}>
        <div className="d-flex gap-2">
          {demoCount > 0 && (
            <span className="badge bg-info" style={{ fontSize: '0.7em' }}>
              {demoCount} Demo
            </span>
          )}
          {anonymousCount > 0 && (
            <span className="badge bg-warning" style={{ fontSize: '0.7em' }}>
              {anonymousCount} Anonymous
            </span>
          )}
          {authenticatedCount > 0 && (
            <span className="badge bg-success" style={{ fontSize: '0.7em' }}>
              {authenticatedCount} Saved
            </span>
          )}
        </div>
      </div>
    );
  };
  
  // Determine bar/line color based on data source
  const getDataPointColor = (entry, index) => {
    if (entry.isDemo && entry.isAnonymous) return '#17a2b8'; // Mixed: teal
    if (entry.isDemo) return '#6c757d'; // Demo: gray
    if (entry.isAnonymous) return '#ffc107'; // Anonymous: yellow
    return '#8884d8'; // Authenticated: default blue
  };

  // Custom bar with dynamic colors for mixed data
  const CustomBar = (props) => {
    if (dataSource !== 'mixed') {
      return <Bar {...props} />;
    }
    
    return (
      <Bar 
        {...props}
        fill={(entry, index) => getDataPointColor(entry, index)}
      />
    );
  };
  
  switch (chartType) {
    case 'bar':
      console.log('[CHART] Rendering bar chart');
      return (
        <div className="position-relative" style={{ width: '100%', height: '100%' }}>
          <DataSourceIndicator />
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis {...xAxisConfig} />
              <YAxis {...yAxisConfig} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ bottom: 10 }} />
              <Bar 
                dataKey="amount" 
                fill={dataSource === 'mixed' ? undefined : "#8884d8"}
                name={`${getViewLabel()} Spending`}
                radius={[2, 2, 0, 0]} // Rounded top corners
              />
              {showAverage && (
                <ReferenceLine 
                  y={averageSpending} 
                  stroke="#ff7300" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ 
                    value: `Avg: $${averageSpending.toFixed(0)}`, 
                    position: 'topRight',
                    fill: '#ff7300',
                    fontSize: 12
                  }} 
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
      
    case 'line':
    default:
      console.log('[CHART] Rendering line chart');
      return (
        <div className="position-relative" style={{ width: '100%', height: '100%' }}>
          <DataSourceIndicator />
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis {...xAxisConfig} />
              <YAxis {...yAxisConfig} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ bottom: 10 }} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#8884d8" 
                activeDot={{ r: 6, fill: '#8884d8' }} 
                name={`${getViewLabel()} Spending`} 
                strokeWidth={3}
                dot={{ r: 4, fill: '#8884d8' }}
              />
              {showAverage && (
                <ReferenceLine 
                  y={averageSpending} 
                  stroke="#ff7300" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  label={{ 
                    value: `Avg: $${averageSpending.toFixed(0)}`, 
                    position: 'topRight',
                    fill: '#ff7300',
                    fontSize: 12
                  }} 
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
  }
};

export default ChartRenderer;
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
  getViewLabel 
}) => {
  
  console.log('ChartRenderer received data:', trendsData);
  console.log('Chart type:', chartType);
  console.log('Time view:', timeView);
  
  if (!trendsData || !trendsData.length) {
    console.log('No data available for chart');
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100%' }}>
        <p className="text-muted">No data to display</p>
      </div>
    );
  }
  
  // Dynamically calculate Y axis range to better fill the space
  const values = trendsData.map(item => item.amount);
  console.log('Amount values:', values);
  
  const minValue = 0; // Start from 0 for better readability
  const maxValue = Math.max(...values) * 1.1; // Add 10% headroom
  
  console.log('Y-axis range:', minValue, 'to', maxValue);
  
  const commonProps = {
    data: trendsData,
    margin: { top: 20, right: 30, left: 20, bottom: 60 }, // Increased margins for better spacing
  };
  
  // Custom tooltip content
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
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
          </p>
          <p className="amount mb-1" style={{ color: '#8884d8', margin: '0 0 4px 0' }}>
            Amount: ${payload[0].value.toFixed(2)}
          </p>
          {timeView === 'receipt' && payload[0].payload.vendor && (
            <p className="vendor mb-0" style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
              Vendor: {payload[0].payload.vendor}
            </p>
          )}
          {timeView !== 'receipt' && payload[0].payload.count && (
            <p className="count mb-0" style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
              Receipts: {payload[0].payload.count}
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
  
  switch (chartType) {
    case 'bar':
      console.log('Rendering bar chart');
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisConfig} />
            <YAxis {...yAxisConfig} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ bottom: 10 }} />
            <Bar 
              dataKey="amount" 
              fill="#8884d8" 
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
                  value: `Avg: ${averageSpending.toFixed(0)}`, 
                  position: 'topRight',
                  fill: '#ff7300',
                  fontSize: 12
                }} 
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      );
      
    case 'line':
    default:
      console.log('Rendering line chart');
      return (
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
                  value: `Avg: ${averageSpending.toFixed(0)}`, 
                  position: 'topRight',
                  fill: '#ff7300',
                  fontSize: 12
                }} 
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
  }
};

export default ChartRenderer;
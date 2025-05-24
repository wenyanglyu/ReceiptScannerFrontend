import React, { useEffect, useState, useMemo } from 'react';
import { ButtonGroup, ToggleButton, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';
import ChartRenderer from './ChartRenderer';

// API base URL - centralize it here
const API_BASE_URL = "https://receiptscannerbackend.onrender.com/api";


const SpendingTrends = () => {
  const [receiptData, setReceiptData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeView, setTimeView] = useState('receipt'); // 'receipt', 'week', 'month', 'year'
  const [chartType, setChartType] = useState('line'); // 'line', 'bar'
  const [showAverage, setShowAverage] = useState(false);
  
  // Fetch all receipt data once
  useEffect(() => {
    const fetchReceiptData = async () => {
      try {
        setLoading(true);
        console.log('Fetching receipt data...');
        
        // Use your existing endpoint that returns all receipts
        const response = await axios.get(`${API_BASE_URL}/Receipt/stats/trends`);
        console.log('Raw API response:', response.data);
        
        // Format and store the raw receipt data
        const formattedReceipts = response.data.map(receipt => {
          console.log('Processing receipt:', receipt);
          
          return {
            id: receipt.id,
            date: new Date(receipt.date),
            // Try different field names for amount - adjust based on your API response
            amount: parseFloat(receipt.amount || receipt.total || receipt.value || 0),
          };
        });
        
        console.log('Formatted receipts:', formattedReceipts);
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
  
  // Process data based on selected view
  const trendsData = useMemo(() => {
    console.log('Processing trends data for view:', timeView);
    console.log('Receipt data:', receiptData);
    
    if (!receiptData.length) {
      console.log('No receipt data available');
      return [];
    }
    
    // Sort receipts by date (oldest first)
    const sortedReceipts = [...receiptData].sort((a, b) => a.date - b.date);
    console.log('Sorted receipts:', sortedReceipts);
    
    switch (timeView) {
      case 'receipt':
        // Just format individual receipts
        const receiptData = sortedReceipts.map(receipt => ({
          label: receipt.date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          }),
          amount: receipt.amount,
        }));
        console.log('Receipt view data:', receiptData);
        return receiptData;
        
      case 'week': {
        // Group receipts by week
        const weeklyData = {};
        
        sortedReceipts.forEach(receipt => {
          // Get week number and year
          const date = receipt.date;
          const year = date.getFullYear();
          
          // Calculate week number (ISO week number)
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
        
        // Convert to array and format for chart
        const weekData = Object.values(weeklyData).map(week => ({
          label: `Week ${week.weekNumber}, ${week.year}`,
          amount: week.amount,
          count: week.receipts.length
        }));
        console.log('Weekly view data:', weekData);
        return weekData;
      }
        
      case 'month': {
        // Group receipts by month
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
        
        // Convert to array and format for chart
        const monthData = Object.values(monthlyData).map(month => {
          const date = new Date(month.year, month.month);
          return {
            label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            amount: month.amount,
            count: month.receipts.length
          };
        });
        console.log('Monthly view data:', monthData);
        return monthData;
      }
        
      case 'year': {
        // Group receipts by year
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
        
        // Convert to array and format for chart
        const yearData = Object.values(yearlyData).map(year => ({
          label: year.year.toString(),
          amount: year.amount,
          count: year.receipts.length
        }));
        console.log('Yearly view data:', yearData);
        return yearData;
      }
        
      default:
        return [];
    }
  }, [receiptData, timeView]);
  
  // Calculated metrics
  const averageSpending = useMemo(() => {
    if (!trendsData.length) return 0;
    const sum = trendsData.reduce((acc, item) => acc + item.amount, 0);
    return sum / trendsData.length;
  }, [trendsData]);
  
  // Highest spending period
  const highestSpending = useMemo(() => {
    if (!trendsData.length) return { label: '', amount: 0 };
    return trendsData.reduce((max, item) => 
      item.amount > max.amount ? item : max, 
      { label: '', amount: 0 }
    );
  }, [trendsData]);

  // Get appropriate label for current view
  const getViewLabel = () => {
    switch(timeView) {
      case 'receipt': return 'Receipt';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
      case 'year': return 'Yearly';
      default: return '';
    }
  };

  // Render loading, error, or empty states
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" style={{ minHeight: '400px' }}>{error}</Alert>;
  }
  
  if (receiptData.length === 0) {
    return <Alert variant="info" style={{ minHeight: '400px' }}>No receipt data available. Upload some receipts to see spending trends.</Alert>;
  }

  return (
    <div className="spending-trends-container d-flex flex-column" style={{ minHeight: '400px' }}>
      {/* Debug information - remove this after fixing */}
      <div className="small text-muted mb-2">
        Debug: {receiptData.length} receipts, {trendsData.length} data points for {timeView} view
      </div>
      
      {/* Controls */}
      <div className="d-flex justify-content-between mb-2">
        <ButtonGroup>
          <ToggleButton
            id="time-receipt"
            type="radio"
            variant="outline-secondary"
            name="time-view"
            value="receipt"
            size="sm"
            checked={timeView === 'receipt'}
            onChange={() => setTimeView('receipt')}
          >
            Per Receipt
          </ToggleButton>
          <ToggleButton
            id="time-week"
            type="radio"
            variant="outline-secondary"
            name="time-view"
            value="week"
            size="sm"
            checked={timeView === 'week'}
            onChange={() => setTimeView('week')}
          >
            Weekly
          </ToggleButton>
          <ToggleButton
            id="time-month"
            type="radio"
            variant="outline-secondary"
            name="time-view"
            value="month"
            size="sm"
            checked={timeView === 'month'}
            onChange={() => setTimeView('month')}
          >
            Monthly
          </ToggleButton>
          <ToggleButton
            id="time-year"
            type="radio"
            variant="outline-secondary"
            name="time-view"
            value="year"
            size="sm"
            checked={timeView === 'year'}
            onChange={() => setTimeView('year')}
          >
            Yearly
          </ToggleButton>
        </ButtonGroup>
        
        <div className="d-flex">
          <ButtonGroup className="me-2">
            <ToggleButton
              type="checkbox"
              variant="outline-secondary"
              checked={showAverage}
              value="1"
              size="sm"
              onChange={() => setShowAverage(!showAverage)}
            >
              Show Average
            </ToggleButton>
          </ButtonGroup>
          
          <ButtonGroup>
            <ToggleButton
              id="chart-line"
              type="radio"
              variant="primary"
              name="chart-type"
              value="line"
              size="sm"
              checked={chartType === 'line'}
              onChange={() => setChartType('line')}
            >
              Line
            </ToggleButton>
            <ToggleButton
              id="chart-bar"
              type="radio"
              variant="primary"
              name="chart-type"
              value="bar"
              size="sm"
              checked={chartType === 'bar'}
              onChange={() => setChartType('bar')}
            >
              Bar
            </ToggleButton>
          </ButtonGroup>
        </div>
      </div>
      
      {/* Key metrics */}
      <div className="d-flex justify-content-end mb-2">
        <span className="small text-muted me-3">
          <strong>Avg. {getViewLabel()} Spending:</strong> ${averageSpending.toFixed(2)}
        </span>
        <span className="small text-muted">
          <strong>Highest {getViewLabel()}:</strong> {highestSpending.label} (${highestSpending.amount.toFixed(2)})
        </span>
      </div>
      
      {/* Chart - Using flex-grow to fill available space */}
        <div className="flex-grow-1" style={{ minHeight: '300px', height: '400px' }}>
        {/* Use this for testing if ChartRenderer doesn't work */}
        {/* <ChartRenderer data={trendsData} type={chartType} /> */}
        
        <ChartRenderer 
          trendsData={trendsData}
          chartType={chartType}
          timeView={timeView}
          showAverage={showAverage}
          averageSpending={averageSpending}
          getViewLabel={getViewLabel}
        />
      </div>
    </div>
  );
};

export default SpendingTrends;

import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CDB',
  '#FF6B6B', '#4D908E', '#FB8072', '#80B1D3', '#FDB462',
  '#B3DE69', '#FCCDE5', '#D9D9D9', '#BC80BD', '#CCEBC5'
];

const CategoryPieChart = ({ 
  receiptsData, 
  processedCategories, 
  processedItems,
  userToken 
}) => {
  const [pieData, setPieData] = useState([]);
  const [wordCloudData, setWordCloudData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Category consolidation mapping
  const consolidateCategories = (categories) => {
    const consolidated = {};
    
    categories.forEach(category => {
      let normalizedName = category.name;
      
      // Consolidate similar categories
      if (['Vegetables', 'Veges', 'Vegetable'].includes(category.name)) {
        normalizedName = 'Vegetables';
      } else if (['Fruits', 'Fruit'].includes(category.name)) {
        normalizedName = 'Fruits';
      } else if (['Drinks', 'Beverages', 'Beverage'].includes(category.name)) {
        normalizedName = 'Beverages';
      } else if (['Meat', 'Meats', 'Seafood'].includes(category.name)) {
        normalizedName = 'Meat & Seafood';
      } else if (['Bakery', 'Bread', 'Baked Goods'].includes(category.name)) {
        normalizedName = 'Bakery';
      } else if (['Household'].includes(category.name)) {
        normalizedName = 'Household';
      } else if (['Dairy'].includes(category.name)) {
        normalizedName = 'Dairy';
      } else if (['Snacks'].includes(category.name)) {
        normalizedName = 'Snacks';
      } else if (['Other'].includes(category.name)) {
        normalizedName = 'Other';
      }
      
      consolidated[normalizedName] = (consolidated[normalizedName] || 0) + category.value;
    });
    
    return Object.entries(consolidated)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100
      }))
      .filter(item => item.value > 0) // Remove zero-value categories
      .sort((a, b) => b.value - a.value); // Sort by value descending
  };

  const handlePieClick = (data, index) => {
    console.log('Pie segment clicked:', data, 'at index:', index);
  };

  // Process authenticated user's data
  useEffect(() => {
    const processData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[CATEGORY] Processing authenticated user data');
        
        try {
          const headers = {
            'Content-Type': 'application/json',
            ...(userToken && { 'Authorization': `Bearer ${userToken}` })
          };

          // Fetch categories from API
          const categoriesResponse = await fetch(
            `${process.env.REACT_APP_API_BASE_URL || 'https://receiptscannerbackend.onrender.com/api'}/Receipt/stats/categories`,
            { headers }
          );

          if (!categoriesResponse.ok) {
            throw new Error(`Categories API failed: ${categoriesResponse.status}`);
          }

          const categoriesData = await categoriesResponse.json();
          
          // Fetch receipts for word cloud
          const receiptsResponse = await fetch(
            `${process.env.REACT_APP_API_BASE_URL || 'https://receiptscannerbackend.onrender.com/api'}/receipt`,
            { headers }
          );

          if (!receiptsResponse.ok) {
            throw new Error(`Receipts API failed: ${receiptsResponse.status}`);
          }

          const receiptsApiData = await receiptsResponse.json();

          // Process categories
          const consolidatedCategories = consolidateCategories(categoriesData || []);
          setPieData(consolidatedCategories);

          // Process word cloud from receipts
          const allItems = [];
          (receiptsApiData || []).forEach(receipt => {
            const items = receipt?.receiptInfo?.Items || receipt?.receiptInfo?.items || [];
            allItems.push(...items);
          });

          const counts = {};
          allItems.forEach(item => {
            const name = (item.CasualName || item.casualName || item.ProductName || item.productName || 'unknown').toLowerCase().trim();
            counts[name] = (counts[name] || 0) + 1;
          });

          const words = Object.entries(counts)
            .map(([text, value]) => ({ text, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 40);

          setWordCloudData(words);
          setLoading(false);

          console.log('[CATEGORY] API data processed:', {
            categories: consolidatedCategories.length,
            wordCloudItems: words.length
          });

        } catch (apiError) {
          console.error('[CATEGORY] API Error:', apiError);
          
          // Fallback to local data processing if API fails but we have receiptsData
          if (receiptsData && receiptsData.length > 0) {
            console.log('[CATEGORY] Falling back to local data processing');
            
            // Use pre-processed categories if available, otherwise calculate from receipts
            let categories = processedCategories || [];
            if (!processedCategories || processedCategories.length === 0) {
              const categoryTotals = {};
              
              receiptsData.forEach(receipt => {
                const receiptInfo = receipt.receiptInfo || receipt;
                const items = receiptInfo?.Items || receiptInfo?.items || [];
                if (Array.isArray(items)) {
                  items.forEach(item => {
                    const category = item.Category || item.category || 'Other';
                    categoryTotals[category] = (categoryTotals[category] || 0) + (item.Price || item.price || 0);
                  });
                }
              });
              
              categories = Object.entries(categoryTotals).map(([name, value]) => ({
                name,
                value: Math.round(value * 100) / 100
              }));
            }

            // Consolidate similar categories
            const consolidatedCategories = consolidateCategories(categories);

            // Use pre-processed items for word cloud if available, otherwise calculate
            let items = processedItems || [];
            if (!processedItems || processedItems.length === 0) {
              const allItems = [];
              
              receiptsData.forEach(receipt => {
                const receiptInfo = receipt.receiptInfo || receipt;
                const receiptItems = receiptInfo?.Items || receiptInfo?.items || [];
                allItems.push(...receiptItems);
              });

              const counts = {};
              allItems.forEach(item => {
                const name = (item.CasualName || item.casualName || item.ProductName || item.productName || 'unknown').toLowerCase().trim();
                counts[name] = (counts[name] || 0) + 1;
              });

              items = Object.entries(counts)
                .map(([text, value]) => ({ text, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 40);
            } else {
              items = items
                .map(item => ({
                  text: item.name.toLowerCase().trim(),
                  value: item.frequency
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 40);
            }

            setPieData(consolidatedCategories);
            setWordCloudData(items);
            setLoading(false);
            
            console.log('[CATEGORY] Local fallback data processed:', {
              categories: consolidatedCategories.length,
              wordCloudItems: items.length
            });
          } else {
            setError('Failed to load data from server');
            setLoading(false);
          }
        }

      } catch (err) {
        console.error('[CATEGORY] Error processing data:', err);
        setError('Failed to load category data');
        setLoading(false);
      }
    };

    processData();
  }, [receiptsData, processedCategories, processedItems, userToken]);

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / pieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.name}</p>
          <p style={{ margin: 0, color: '#666' }}>
            Amount: ${data.value.toFixed(2)}
          </p>
          <p style={{ margin: 0, color: '#666' }}>
            Percentage: {percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom label formatter
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%
    
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Loading and error states
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        padding: '2rem' 
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem', color: '#666' }}>Loading chart data...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        padding: '2rem',
        color: '#dc3545'
      }}>
        <h6>Error Loading Data</h6>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #007bff',
            backgroundColor: 'transparent',
            color: '#007bff',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!pieData.length) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        padding: '2rem' 
      }}>
        <h6 style={{ color: '#666', marginBottom: '0.5rem' }}>No Data Available</h6>
        <p style={{ color: '#666', margin: 0, textAlign: 'center' }}>
          Upload some receipts to see category breakdown.
        </p>
      </div>
    );
  }

  const totalSpent = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row' }}>
      {/* Pie Chart */}
      <div style={{ flex: '0 0 65%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius="80%"
              fill="#8884d8"
              dataKey="value"
              onClick={handlePieClick}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value) => value}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category Stats */}
      <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px' }}>
        <div className="category-stats">
          <h6 style={{ marginBottom: '15px', fontSize: '1.1rem', fontWeight: 'bold' }}>
            Category Breakdown
          </h6>
          <div className="stats-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {pieData.map((category, index) => {
              const percentage = ((category.value / totalSpent) * 100).toFixed(1);
              return (
                <div key={category.name} className="stat-item" style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '4px',
                  borderLeft: `4px solid ${COLORS[index % COLORS.length]}`,
                  padding: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{category.name}</span>
                    <span style={{ color: '#666' }}>{percentage}%</span>
                  </div>
                  <div style={{ color: '#28a745', fontWeight: 'bold' }}>${category.value.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ 
            marginTop: '15px', 
            padding: '8px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            borderRadius: '4px' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Spending:</span>
              <span style={{ fontWeight: 'bold' }}>${totalSpent.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPieChart;
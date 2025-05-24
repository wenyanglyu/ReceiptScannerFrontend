import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ReactWordcloud from 'react-wordcloud';
import { Row, Col } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = 'https://localhost:7276/api';

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CDB',
  '#FF6B6B', '#4D908E', '#FB8072', '#80B1D3', '#FDB462'
];



const CategoryPieChart = () => {
  const [pieData, setPieData] = useState([]);
  const [wordCloudData, setWordCloudData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handlePieClick = (data, index) => {
  // Currently does nothing but ready for future implementation
  console.log('Pie segment clicked:', data, 'at index:', index);
    };

  // Fetch pie chart data (category spending)
  useEffect(() => {
    const fetchPieData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/Receipt/stats/categories`);
        setPieData(response.data || []);
      } catch (err) {
        console.error('Error fetching category data:', err);
        setError('Failed to load category data');
      } finally {
        setLoading(false);
      }
    };
    fetchPieData();
  }, []);

  // Fetch word cloud data (casualName frequency)
  useEffect(() => {
    const fetchWordCloud = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/receipt`);
        const allReceipts = response.data || [];
        const allItems = allReceipts.flatMap(r => r.receiptInfo?.items || []);

        const counts = {};
        allItems.forEach(item => {
          const name = item.casualName?.toLowerCase().trim() || 'unknown';
          counts[name] = (counts[name] || 0) + 1;
        });

        const words = Object.entries(counts)
        .map(([text, value]) => ({ text, value }))
        .sort((a, b) => b.value - a.value) // sort by frequency
        .slice(0, 40); // limit to top 30

        setWordCloudData(words);
      } catch (err) {
        console.error('Error fetching word cloud data:', err);
        setError('Failed to load word cloud data');
      }
    };
    fetchWordCloud();
  }, []);

  // Loading and error states
  if (loading) {
    return <div className="text-center py-5">Loading chart data...</div>;
  }

  if (error) {
    return <div className="text-center py-5 text-danger">{error}</div>;
  }

  if (!pieData.length && !wordCloudData.length) {
    return <div className="text-center py-5">No data available</div>;
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Row className="h-100">
        {/* Pie Chart */}
        <Col md={6} className="h-100">
          <ResponsiveContainer width="100%" height="110%">
            <PieChart>
              <Pie
                data={pieData}
                cx="53%"
                cy="43%"
                outerRadius="70%"
                labelLine={false}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                onClick={handlePieClick} 
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </Col>

        {/* Word Cloud */}
        <Col md={6} className="d-flex align-items-center justify-content-center">
          <div style={{ width: '100%', height: '100%' }}>
            <ReactWordcloud
              words={wordCloudData}
              options={{
                rotations: 2,
                rotationAngles: [0, 90],
                fontSizes: [25, 85],
                scale: 'sqrt',
                deterministic: true,
                fontFamily: 'sans-serif',
                enableTooltip: true
              }}
            />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default CategoryPieChart;

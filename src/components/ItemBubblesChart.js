import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// 5 premium bubble design variations
const BUBBLE_DESIGNS = [
  {
    gradient: 'radial-gradient(circle at center, #000000 0%, #000000 30%, rgba(0, 50, 40, 1) 50%, rgba(0, 100, 80, 1) 70%, rgba(0, 212, 170, 1) 90%, #00f5cc 100%)',
    border: '#00f5cc'
  },
  {
    gradient: 'radial-gradient(circle at center, #000000 0%, #000000 30%, rgba(50, 0, 40, 1) 50%, rgba(100, 0, 80, 1) 70%, rgba(212, 0, 170, 1) 90%, #f500cc 100%)',
    border: '#f500cc'
  },
  {
    gradient: 'radial-gradient(circle at center, #000000 0%, #000000 30%, rgba(40, 30, 0, 1) 50%, rgba(80, 60, 0, 1) 70%, rgba(170, 130, 0, 1) 90%, #ffcc00 100%)',
    border: '#ffcc00'
  },
  {
    gradient: 'radial-gradient(circle at center, #000000 0%, #000000 30%, rgba(0, 30, 50, 1) 50%, rgba(0, 60, 100, 1) 70%, rgba(0, 130, 212, 1) 90%, #0099ff 100%)',
    border: '#0099ff'
  },
  {
    gradient: 'radial-gradient(circle at center, #000000 0%, #000000 30%, rgba(30, 0, 50, 1) 50%, rgba(60, 0, 100, 1) 70%, rgba(130, 0, 212, 1) 90%, #9900ff 100%)',
    border: '#9900ff'
  }
];

const PhysicsBubblesChart = () => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [viewMode, setViewMode] = useState('frequency');
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [itemData, setItemData] = useState([]);
  const [loading, setLoading] = useState(true);
  const simulationRef = useRef();

  // Sample data
  useEffect(() => {
    setTimeout(() => {
      const sampleData = [
        { name: 'milk', frequency: 15, totalSpent: 65.50 },
        { name: 'eggs', frequency: 12, totalSpent: 48.00 },
        { name: 'bread', frequency: 10, totalSpent: 35.00 },
        { name: 'chicken', frequency: 8, totalSpent: 95.20 },
        { name: 'apples', frequency: 9, totalSpent: 42.30 },
        { name: 'carrots', frequency: 7, totalSpent: 28.70 },
        { name: 'tomatoes', frequency: 11, totalSpent: 55.80 },
        { name: 'lettuce', frequency: 6, totalSpent: 24.50 },
        { name: 'potatoes', frequency: 5, totalSpent: 18.90 },
        { name: 'onions', frequency: 4, totalSpent: 15.60 },
        { name: 'coffee', frequency: 13, totalSpent: 78.00 },
        { name: 'pasta', frequency: 6, totalSpent: 32.40 },
        { name: 'rice', frequency: 4, totalSpent: 22.80 },
        { name: 'bananas', frequency: 8, totalSpent: 35.20 },
        { name: 'beer', frequency: 3, totalSpent: 45.60 }
      ];
      setItemData(sampleData);
      setLoading(false);
    }, 1000);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: Math.max(500, window.innerHeight * 0.7)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create physics simulation with active movement
  useEffect(() => {
    if (!itemData.length || loading) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    
    // Calculate bubble sizes to fill 90% of space efficiently
    const totalArea = width * height * 0.9;
    const maxValue = viewMode === 'frequency' 
      ? Math.max(...itemData.map(d => d.frequency))
      : Math.max(...itemData.map(d => d.totalSpent));
    
    const totalDataValue = itemData.reduce((sum, d) => sum + (viewMode === 'frequency' ? d.frequency : d.totalSpent), 0);

    const nodes = itemData.map((d, i) => {
      const value = viewMode === 'frequency' ? d.frequency : d.totalSpent;
      const proportion = value / totalDataValue;
      const area = totalArea * proportion;
      const radius = Math.sqrt(area / Math.PI);
      const clampedRadius = Math.max(25, Math.min(80, radius));
      
      return {
        id: d.name,
        name: d.name,
        value: value,
        frequency: d.frequency,
        totalSpent: d.totalSpent,
        radius: clampedRadius,
        design: BUBBLE_DESIGNS[i % BUBBLE_DESIGNS.length],
        x: Math.random() * (width - clampedRadius * 2) + clampedRadius,
        y: Math.random() * (height - clampedRadius * 2) + clampedRadius,
        vx: (Math.random() - 0.5) * 2, // More initial velocity
        vy: (Math.random() - 0.5) * 2
      };
    });

    // Create force simulation with bouncing
    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-100))
      .force('collision', d3.forceCollide().radius(d => d.radius + 4).strength(0.8))
      .force('boundary', () => {
        // Bouncing boundary force
        nodes.forEach(d => {
          if (d.x - d.radius <= 0) {
            d.x = d.radius;
            d.vx = Math.abs(d.vx) * 0.8; // Bounce with some energy loss
          }
          if (d.x + d.radius >= width) {
            d.x = width - d.radius;
            d.vx = -Math.abs(d.vx) * 0.8;
          }
          if (d.y - d.radius <= 0) {
            d.y = d.radius;
            d.vy = Math.abs(d.vy) * 0.8;
          }
          if (d.y + d.radius >= height) {
            d.y = height - d.radius;
            d.vy = -Math.abs(d.vy) * 0.8;
          }
        });
      })
      .velocityDecay(0.95) // Less decay to maintain movement
      .alphaDecay(0.01); // Slower decay to keep simulation active

    // Add continuous movement force
    const movementForce = () => {
      nodes.forEach(d => {
        // Add small random forces to keep bubbles moving
        d.vx += (Math.random() - 0.5) * 0.1;
        d.vy += (Math.random() - 0.5) * 0.1;
        
        // Limit velocity to prevent too fast movement
        const maxVelocity = 3;
        d.vx = Math.max(-maxVelocity, Math.min(maxVelocity, d.vx));
        d.vy = Math.max(-maxVelocity, Math.min(maxVelocity, d.vy));
      });
    };

    simulation.force('movement', movementForce);
    simulationRef.current = simulation;

    // Create container for bubbles
    const container = svg.append('g');

    // Create HTML bubbles using foreignObject for better styling
    const bubbleGroups = container.selectAll('.bubble-group')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'bubble-group')
      .style('cursor', 'pointer');

    const foreignObjects = bubbleGroups.append('foreignObject')
      .attr('width', d => d.radius * 2)
      .attr('height', d => d.radius * 2)
      .attr('x', d => -d.radius)
      .attr('y', d => -d.radius);

    const bubbleHtml = foreignObjects.append('xhtml:div')
      .style('width', d => `${d.radius * 2}px`)
      .style('height', d => `${d.radius * 2}px`)
      .style('border-radius', '50%')
      .style('background', d => d.design.gradient)
      .style('border', d => `1px solid ${d.design.border}`)
      .style('box-shadow', '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.1)')
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('justify-content', 'center')
      .style('align-items', 'center')
      .style('transition', 'transform 0.3s ease')
      .style('position', 'relative')
      .style('overflow', 'hidden');

    // Add glossy highlights
    bubbleHtml.append('div')
      .style('position', 'absolute')
      .style('top', d => `${d.radius * 0.15}px`)
      .style('left', d => `${d.radius * 0.25}px`)
      .style('width', d => `${d.radius * 0.7}px`)
      .style('height', d => `${d.radius * 0.35}px`)
      .style('background', 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)')
      .style('border-radius', '50px')
      .style('transform', 'rotate(-15deg)')
      .style('pointer-events', 'none')
      .style('filter', 'blur(1px)');

    // Add secondary shine
    bubbleHtml.append('div')
      .style('position', 'absolute')
      .style('top', d => `${d.radius * 0.3}px`)
      .style('right', d => `${d.radius * 0.35}px`)
      .style('width', d => `${d.radius * 0.3}px`)
      .style('height', d => `${d.radius * 0.2}px`)
      .style('background', 'linear-gradient(45deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)')
      .style('border-radius', '50px')
      .style('transform', 'rotate(20deg)')
      .style('pointer-events', 'none')
      .style('filter', 'blur(0.5px)');

    // Add item name
    bubbleHtml.append('div')
      .style('font-size', d => `${Math.max(10, d.radius * 0.25)}px`)
      .style('font-weight', '700')
      .style('color', 'white')
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.8)')
      .style('text-align', 'center')
      .style('z-index', '3')
      .style('margin-bottom', '2px')
      .text(d => d.name.toUpperCase());

    // Add value
    bubbleHtml.append('div')
      .style('font-size', d => `${Math.max(8, d.radius * 0.18)}px`)
      .style('font-weight', '600')
      .style('color', 'white')
      .style('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.8)')
      .style('text-align', 'center')
      .style('z-index', '3')
      .text(d => viewMode === 'frequency' ? `${d.frequency}x` : `$${d.totalSpent.toFixed(0)}`);

    // Add hover effects
    bubbleGroups
      .on('mouseenter', function(event, d) {
        d3.select(this).select('div')
          .style('transform', 'scale(1.05)');
        
        // Add tooltip
        const tooltip = container.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${d.x}, ${d.y - d.radius - 45})`);
        
        const bg = tooltip.append('rect')
          .attr('x', -60)
          .attr('y', -25)
          .attr('width', 120)
          .attr('height', 50)
          .attr('fill', 'rgba(44, 47, 54, 0.95)')
          .attr('stroke', d.design.border)
          .attr('stroke-width', 2)
          .attr('rx', 8);
        
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -8)
          .attr('fill', 'white')
          .attr('font-size', '12')
          .attr('font-weight', '700')
          .text(d.name.toUpperCase());
        
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 8)
          .attr('fill', d.design.border)
          .attr('font-size', '10')
          .attr('font-weight', '600')
          .text(`Bought ${d.frequency} times`);
        
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 22)
          .attr('fill', d.design.border)
          .attr('font-size', '10')
          .attr('font-weight', '600')
          .text(`Spent $${d.totalSpent.toFixed(2)}`);
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('div')
          .style('transform', 'scale(1)');
        
        container.select('.tooltip').remove();
      });

    // Add drag behavior
    const drag = d3.drag()
      .on('start', function(event, d) {
        if (!event.active) simulation.alphaTarget(0.5).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function(event, d) {
        if (!event.active) simulation.alphaTarget(0.1);
        d.fx = null;
        d.fy = null;
      });

    bubbleGroups.call(drag);

    // Add click effects
    bubbleGroups.on('click', function(event, d) {
      d3.select(this).select('div')
        .style('transform', 'scale(1.2)')
        .transition()
        .duration(300)
        .style('transform', 'scale(1)');
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      bubbleGroups.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Keep simulation running with periodic restarts
    const keepAlive = setInterval(() => {
      if (simulation.alpha() < 0.1) {
        simulation.alphaTarget(0.3).restart();
        setTimeout(() => simulation.alphaTarget(0.1), 1000);
      }
    }, 3000);

    // Cleanup
    return () => {
      simulation.stop();
      clearInterval(keepAlive);
    };
  }, [itemData, viewMode, dimensions, loading]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        background: '#2c2f36',
        borderRadius: '1rem',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #00f5cc',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Loading premium bubbles...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Toggle Controls */}
      <div style={{ marginBottom: '1rem', position: 'relative', zIndex: 10 }}>
        <div style={{ 
          display: 'flex', 
          background: 'rgba(44, 47, 54, 0.9)',
          borderRadius: '0.5rem',
          padding: '0.25rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 245, 204, 0.3)'
        }}>
          <button
            onClick={() => setViewMode('frequency')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: 'none',
              backgroundColor: viewMode === 'frequency' ? '#00f5cc' : 'transparent',
              color: viewMode === 'frequency' ? '#000' : 'white',
              borderRadius: '0.375rem',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🔢 Most Frequent
          </button>
          <button
            onClick={() => setViewMode('spending')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: 'none',
              backgroundColor: viewMode === 'spending' ? '#00f5cc' : 'transparent',
              color: viewMode === 'spending' ? '#000' : 'white',
              borderRadius: '0.375rem',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            💰 Highest Spending
          </button>
        </div>
      </div>

      {/* Physics Bubble Chart */}
      <div 
        ref={containerRef}
        style={{ 
          position: 'relative',
          borderRadius: '1rem',
          overflow: 'hidden',
          background: '#2c2f36',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          height: '70vh',
          minHeight: '500px'
        }}
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{ 
            background: 'radial-gradient(circle at center, rgba(255,255,255,0.02) 0%, transparent 70%)',
            display: 'block'
          }}
        />
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PhysicsBubblesChart;
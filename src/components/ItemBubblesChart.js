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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
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
    
    // Calculate bubble sizes based on data values with 1x to 4x scaling
    const maxValue = viewMode === 'frequency' 
      ? Math.max(...itemData.map(d => d.frequency))
      : Math.max(...itemData.map(d => d.totalSpent));
    
    const minValue = viewMode === 'frequency' 
      ? Math.min(...itemData.map(d => d.frequency))
      : Math.min(...itemData.map(d => d.totalSpent));

    const nodes = itemData.map((d, i) => {
      const value = viewMode === 'frequency' ? d.frequency : d.totalSpent;
      
      // Scale from 1x to 4x based on data value
      let scaleFactor;
      if (maxValue === minValue) {
        // If all values are the same, use middle scaling
        scaleFactor = 2.5;
      } else {
        // Linear scaling from 1 to 4
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        scaleFactor = 1 + (normalizedValue * 3); // 1 + (0 to 1) * 3 = 1 to 4
      }
      
      // Base radius calculation - proportional for mobile, fixed for desktop
      let baseRadius;
      if (isMobile) {
        // Calculate proportional sizing for mobile
        const availableWidth = width * 0.8; // 80% of screen width
        const totalBubbles = itemData.length;
        
        // Estimate bubbles per row based on screen width
        let bubblesPerRow;
        if (width <= 375) {
          bubblesPerRow = 3; // Tight packing for small screens
        } else if (width <= 414) {
          bubblesPerRow = 4; // Medium packing
        } else {
          bubblesPerRow = 5; // More generous for larger phones
        }
        
        // Calculate total scale units for all bubbles
        const allScaleFactors = itemData.map(item => {
          const val = viewMode === 'frequency' ? item.frequency : item.totalSpent;
          if (maxValue === minValue) return 2.5;
          const normalizedVal = (val - minValue) / (maxValue - minValue);
          return 1 + (normalizedVal * 3);
        });
        
        const averageScale = allScaleFactors.reduce((sum, scale) => sum + scale, 0) / totalBubbles;
        
        // Calculate base radius as percentage of available space
        // More conservative calculation to ensure all bubbles fit
        baseRadius = (availableWidth / bubblesPerRow) / (averageScale * 2.5); // Increased from 2.5 to 3.5
        
        // More restrictive bounds for mobile
        baseRadius = Math.max(8, Math.min(25, baseRadius)); // Reduced max from 30 to 25
      } else {
        // Desktop uses fixed sizing
        baseRadius = 25;
      }
      
      const radius = baseRadius * scaleFactor;
      
      return {
        id: d.name,
        name: d.name,
        value: value,
        frequency: d.frequency,
        totalSpent: d.totalSpent,
        radius: radius,
        design: BUBBLE_DESIGNS[i % BUBBLE_DESIGNS.length],
        // Safe initial positioning - ensure bubbles start well within bounds
        x: Math.random() * (width - radius * 2.5) + radius * 1.25, // More conservative positioning
        y: Math.random() * (height - radius * 2.5) + radius * 1.25,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      };
    });

    // Create force simulation with mobile-optimized settings
    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(isMobile ? -40 : -80)) // Much weaker repulsion on mobile
      .force('collision', d3.forceCollide()
        .radius(d => d.radius + (isMobile ? 2 : 2))
        .strength(0.9)
        .iterations(isMobile ? 2 : 1) // More collision iterations on mobile
      )
      .force('center', d3.forceCenter(width / 2, height / 2).strength(isMobile ? 0.1 : 0.02)) // Much stronger center force on mobile
      .force('boundary', () => {
        // Much stricter boundary enforcement for mobile
        nodes.forEach(d => {
          const margin = isMobile ? Math.max(5, d.radius * 0.2) : 10; // Dynamic margin with minimum
          
          // Strict boundary checking with immediate correction
          if (d.x - d.radius <= margin) {
            d.x = d.radius + margin;
            d.vx = Math.abs(d.vx) * (isMobile ? 0.4 : 0.8); // Much gentler bouncing
          }
          if (d.x + d.radius >= width - margin) {
            d.x = width - d.radius - margin;
            d.vx = -Math.abs(d.vx) * (isMobile ? 0.4 : 0.8);
          }
          if (d.y - d.radius <= margin) {
            d.y = d.radius + margin;
            d.vy = Math.abs(d.vy) * (isMobile ? 0.4 : 0.8);
          }
          if (d.y + d.radius >= height - margin) {
            d.y = height - d.radius - margin;
            d.vy = -Math.abs(d.vy) * (isMobile ? 0.4 : 0.8);
          }
          
          // Additional safety check - force bubbles back if they somehow escape
          if (isMobile) {
            d.x = Math.max(d.radius + 5, Math.min(width - d.radius - 5, d.x));
            d.y = Math.max(d.radius + 5, Math.min(height - d.radius - 5, d.y));
          }
        });
      })
      .velocityDecay(isMobile ? 0.88 : 0.92) // Higher decay on mobile to reduce movement
      .alphaDecay(0.002)

    // Simplified movement force with mobile constraints
    const movementForce = () => {
      nodes.forEach(d => {
        // Much gentler random forces on mobile
        const forceStrength = isMobile ? 0.05 : 0.15;
        d.vx += (Math.random() - 0.5) * forceStrength;
        d.vy += (Math.random() - 0.5) * forceStrength;
        
        // Stricter velocity limits on mobile
        const maxVelocity = isMobile ? 1.5 : 3;
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
      .style('font-size', d => `${Math.max(8, d.radius * (isMobile ? 0.2 : 0.25))}px`)
      .style('font-weight', '700')
      .style('color', 'white')
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.8)')
      .style('text-align', 'center')
      .style('z-index', '3')
      .style('margin-bottom', '2px')
      .style('line-height', '1')
      .text(d => d.name.toUpperCase());

    // Add value
    bubbleHtml.append('div')
      .style('font-size', d => `${Math.max(6, d.radius * (isMobile ? 0.15 : 0.18))}px`)
      .style('font-weight', '600')
      .style('color', 'white')
      .style('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.8)')
      .style('text-align', 'center')
      .style('z-index', '3')
      .style('line-height', '1')
      .text(d => viewMode === 'frequency' ? `${d.frequency}x` : `${d.totalSpent.toFixed(0)}`);

    // Add hover effects - NO SIZE CHANGE
    bubbleGroups
      .on('mouseenter', function(event, d) {
        // Only change cursor and add tooltip - no size change
        d3.select(this).style('cursor', 'pointer');
        
        // Enhanced tooltip with more information
        const tooltip = container.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${d.x}, ${d.y - d.radius - 55})`);
        
        const tooltipBg = tooltip.append('rect')
          .attr('x', -70)
          .attr('y', -35)
          .attr('width', 140)
          .attr('height', 70)
          .attr('fill', 'rgba(44, 47, 54, 0.95)')
          .attr('stroke', d.design.border)
          .attr('stroke-width', 2)
          .attr('rx', 8)
          .style('filter', 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))');
        
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -20)
          .attr('fill', 'white')
          .attr('font-size', isMobile ? '11' : '12')
          .attr('font-weight', '700')
          .text(d.name.toUpperCase());
        
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -5)
          .attr('fill', d.design.border)
          .attr('font-size', isMobile ? '9' : '10')
          .attr('font-weight', '600')
          .text(`Purchased ${d.frequency} times`);
        
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 10)
          .attr('fill', d.design.border)
          .attr('font-size', isMobile ? '9' : '10')
          .attr('font-weight', '600')
          .text(`Total spent: ${d.totalSpent.toFixed(2)}`);
        
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 25)
          .attr('fill', '#ccc')
          .attr('font-size', isMobile ? '8' : '9')
          .attr('font-weight', '500')
          .text(`Avg: ${(d.totalSpent / d.frequency).toFixed(2)} per purchase`);
      })
      .on('mouseleave', function(event, d) {
        // Remove tooltip only - no size change
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

    // Update positions on simulation tick with strict boundary enforcement
    simulation.on('tick', () => {
      // Additional boundary enforcement on every tick for mobile
      if (isMobile) {
        nodes.forEach(d => {
          // Force bubbles to stay within strict bounds
          const safeMargin = 10;
          d.x = Math.max(d.radius + safeMargin, Math.min(width - d.radius - safeMargin, d.x));
          d.y = Math.max(d.radius + safeMargin, Math.min(height - d.radius - safeMargin, d.y));
        });
      }
      
      bubbleGroups.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Keep simulation active with mobile-aware restarts
    const restartInterval = isMobile ? 4000 : 2000; // Less frequent restarts on mobile
    const keepAlive = setInterval(() => {
      const targetAlpha = isMobile ? 0.2 : 0.4; // Less aggressive on mobile
      
      if (simulation.alpha() < 0.05) {
        simulation.alphaTarget(targetAlpha).restart();
        setTimeout(() => simulation.alphaTarget(0.1), restartInterval / 2);
      }
    }, restartInterval);

    // Cleanup
    return () => {
      simulation.stop();
      clearInterval(keepAlive);
    };
  }, [itemData, viewMode, dimensions, loading, isMobile]);

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
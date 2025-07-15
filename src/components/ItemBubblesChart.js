import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

// API base URL
const REACT_APP_API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

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

const PhysicsBubblesChart = ({ 
  receiptsData = [],
  isAuthenticated = false,
  isDemoMode = true,
  processedItems = null,
  userToken = null
}) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const viewMode = 'frequency';
  
  // ✅ STEP 1: Start with hardcoded fallback values
  const [dimensions, setDimensions] = useState(() => {
    const isMobileInit = window.innerWidth <= 768;
    return {
      width: isMobileInit ? 360 : 1240,
      height: isMobileInit ? 500 : 584,
      source: 'hardcoded' // Track the source for debugging
    };
  });

  const [itemData, setItemData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const simulationRef = useRef();

  useEffect(() => {
    const detectInitialContainerSize = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const realWidth = rect.width || container.clientWidth;
        const realHeight = rect.height || container.clientHeight;
        
        // Only update if we get valid real dimensions
        if (realWidth > 0 && realHeight > 0) {
          setDimensions(prev => {
            console.log('[BUBBLES] 📐 Initial container detection:', {
              from: { width: prev.width, height: prev.height, source: prev.source },
              to: { width: realWidth, height: realHeight, source: 'container-initial' }
            });
            
            return {
              width: realWidth,
              height: realHeight,
              source: 'container-initial'
            };
          });
          
          setIsMobile(realWidth <= 768);
        }
      }
    };
    detectInitialContainerSize(); // Immediate
    
    const timeouts = [
      setTimeout(detectInitialContainerSize, 50),   // After 50ms
      setTimeout(detectInitialContainerSize, 100),  // After 100ms
      setTimeout(detectInitialContainerSize, 200),  // After 200ms
      setTimeout(detectInitialContainerSize, 500),  // After 500ms (final fallback)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []); // Run once on mount
  
  // Process data based on mode (demo vs authenticated)
  useEffect(() => {
    const processData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[BUBBLES] Processing data:', {
          isDemoMode,
          isAuthenticated,
          receiptsDataLength: receiptsData?.length || 0,
          processedItemsLength: processedItems?.length || 0
        });

        if (isDemoMode && receiptsData && receiptsData.length > 0) {
          // Use demo/anonymous data directly
          console.log('[BUBBLES] Processing demo data:', receiptsData.length, 'receipts');
          
          // Use pre-processed items if available, otherwise calculate
          let items = processedItems || [];
          if (!processedItems || processedItems.length === 0) {
            console.log('[BUBBLES] No processed items, calculating from receipts...');
            
            const allItems = receiptsData.flatMap(receipt => 
              receipt.receiptInfo?.items || receipt.receiptInfo?.Items || []
            );

            console.log('[BUBBLES] Found', allItems.length, 'total items');

            const itemCounts = {};
            const itemSpending = {};
            
            allItems.forEach(item => {
              const name = (item.casualName || item.CasualName || item.productName || item.ProductName || 'unknown').toLowerCase().trim();
              const price = parseFloat(item.price || item.Price || 0);
              
              itemCounts[name] = (itemCounts[name] || 0) + 1;
              itemSpending[name] = (itemSpending[name] || 0) + price;
            });

            items = Object.entries(itemCounts)
              .map(([name, frequency]) => ({
                name,
                frequency,
                totalSpent: itemSpending[name] || 0
              }))
              .sort((a, b) => b.frequency - a.frequency)
              .slice(0, isMobile ? 20 : 100);
          } else {
            // Convert processed items to expected format
            items = processedItems
              .map(item => ({
                name: item.name || item.text || 'Unknown',
                frequency: item.frequency || item.value || item.count || 0,
                totalSpent: item.totalSpent || item.amount || 0
              }))
              .sort((a, b) => b.frequency - a.frequency)
              .slice(0, isMobile ? 20 : 100);
          }

          console.log('[BUBBLES] Demo data processed:', items.length, 'items');
          setItemData(items);
          setLoading(false);

        } else if (isAuthenticated && !isDemoMode) {
          // Fetch from API for authenticated users
          console.log('[BUBBLES] Fetching authenticated data from API');
          
          const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          };
          
          if (userToken) {
            headers['Authorization'] = `Bearer ${userToken}`;
          }
          
          const response = await fetch(`${REACT_APP_API_BASE_URL}/Receipt/stats/items`, { headers });
          
          if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          const maxItems = isMobile ? 20 : 100;

          const formattedData = data
            .map(item => ({
              name: item.name || item.itemName || item.item || 'Unknown Item',
              frequency: item.frequency || item.purchaseCount || item.times || item.count || 0,
              totalSpent: parseFloat(item.totalSpent || item.totalAmount || item.amount || item.total || 0)
            }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, maxItems);
          
          if (formattedData.length === 0) {
            throw new Error('No items found in API response');
          }
          
          console.log('[BUBBLES] API data processed:', formattedData.length, 'items');
          setItemData(formattedData);
          setLoading(false);
          
        } else {
          // No data available or mixed mode
          console.log('[BUBBLES] No data available or mixed mode');
          setItemData([]);
          setLoading(false);
        }

      } catch (err) {
        console.error('[BUBBLES] Error processing data:', err);
        setError(`Failed to load item data: ${err.message}`);
        setLoading(false);
      }
    };

    processData();
  }, [receiptsData, isAuthenticated, isDemoMode, processedItems, isMobile, userToken]);
  
  // Handle window resize and mobile detection
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const realWidth = rect.width || container.clientWidth;
        const realHeight = rect.height || container.clientHeight;
        
        if (realWidth > 0 && realHeight > 0) {
          setDimensions(prev => {
            // Only update if significantly different
            const widthDiff = Math.abs(prev.width - realWidth);
            const heightDiff = Math.abs(prev.height - realHeight);
            
            if (widthDiff > 10 || heightDiff > 10) {
              console.log('[BUBBLES] 📐 Resize container detection:', {
                from: { width: prev.width, height: prev.height, source: prev.source },
                to: { width: realWidth, height: realHeight, source: 'container-resize' }
              });
              
              return {
                width: realWidth,
                height: realHeight,
                source: 'container-resize'
              };
            }
            return prev;
          });
          
          setIsMobile(realWidth <= 768);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!itemData.length || loading || error) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height, source } = dimensions;

    console.log('[BUBBLES] === PHYSICS DEBUG ===');
    console.log('[BUBBLES] SVG width:', width);
    console.log('[BUBBLES] SVG height:', height);
    console.log('[BUBBLES] Mobile mode:', isMobile);
    console.log('[BUBBLES] Dimension source:', source);
    console.log('[BUBBLES] Data points:', itemData.length);
    
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
        scaleFactor = 2.5;
      } else {
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        scaleFactor = 1 + (normalizedValue * 3);
      }
      
      // Base radius calculation - proportional for mobile, fixed for desktop
      let baseRadius;
      if (isMobile) {
        const availableWidth = width * 0.8;
        const totalBubbles = itemData.length;
        
        let bubblesPerRow;
        if (width <= 375) {
          bubblesPerRow = 3;
        } else if (width <= 414) {
          bubblesPerRow = 4;
        } else {
          bubblesPerRow = 5;
        }
        
        const allScaleFactors = itemData.map(item => {
          const val = viewMode === 'frequency' ? item.frequency : item.totalSpent;
          if (maxValue === minValue) return 2.5;
          const normalizedVal = (val - minValue) / (maxValue - minValue);
          return 1 + (normalizedVal * 3);
        });
        
        const averageScale = allScaleFactors.reduce((sum, scale) => sum + scale, 0) / totalBubbles;
        
        baseRadius = (availableWidth / bubblesPerRow) / (averageScale * 2.8);
        baseRadius = Math.max(8, Math.min(30, baseRadius));
      } else {
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
        x: width / 2,
        y: height / 2,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      };
    });

    // Create force simulation with container-based boundaries
    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(isMobile ? -40 : -80))
      .force('collision', d3.forceCollide()
        .radius(d => d.radius + (isMobile ? 2 : 2))
        .strength(0.9)
        .iterations(isMobile ? 2 : 1)
      )
      .force('center', d3.forceCenter(width / 2, height / 2).strength(isMobile ? 0.3 : 0.02))
      .force('boundary', () => {
        nodes.forEach(d => {
          // ✅ Use container dimensions for boundaries
          const margin = isMobile ? 8 : 5;
          const minX = d.radius + margin;
          const maxX = width - d.radius - margin;
          const minY = d.radius + margin;
          const maxY = height - d.radius - margin;
          
          if (d.x < minX) {
            d.x = minX;
            d.vx = Math.abs(d.vx) * 0.8;
          }
          if (d.x > maxX) {
            d.x = maxX;
            d.vx = -Math.abs(d.vx) * 0.8;
          }
          if (d.y < minY) {
            d.y = minY;
            d.vy = Math.abs(d.vy) * 0.8;
          }
          if (d.y > maxY) {
            d.y = maxY;
            d.vy = -Math.abs(d.vy) * 0.8;
          }
        });
      })
      .velocityDecay(isMobile ? 0.88 : 0.92)
      .alphaDecay(0.002);

    const movementForce = () => {
      nodes.forEach(d => {
        const forceStrength = isMobile ? 0.05 : 0.15;
        d.vx += (Math.random() - 0.5) * forceStrength;
        d.vy += (Math.random() - 0.5) * forceStrength;
        
        const maxVelocity = isMobile ? 1.5 : 3;
        d.vx = Math.max(-maxVelocity, Math.min(maxVelocity, d.vx));
        d.vy = Math.max(-maxVelocity, Math.min(maxVelocity, d.vy));
      });
    };

    simulation.force('movement', movementForce);
    simulationRef.current = simulation;

    // After creating the simulation, add this:
    setTimeout(() => {
      // Reposition bubbles randomly after container is ready
      nodes.forEach(d => {
        d.x = (Math.random() * 0.6 + 0.2) * width;  // 30%-70% of width
        d.y = (Math.random() * 0.6 + 0.2) * height; // 30%-70% of height
        d.vx = (Math.random() - 0.5) * 8; // Add some initial velocity
        d.vy = (Math.random() - 0.5) * 8;
      });
      
      // Restart simulation with new positions
      simulation.alpha(0.8).restart();
    }, 100); // Small delay to ensure container is ready
    
    const container = svg.append('g');
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

    bubbleHtml.append('div')
      .style('font-size', d => `${Math.max(10, d.radius * (isMobile ? 0.3 : 0.35))}px`)
      .style('font-weight', '700')
      .style('color', 'white')
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.8)')
      .style('text-align', 'center')
      .style('z-index', '3')
      .style('margin-bottom', '2px')
      .style('line-height', '1')
      .text(d => d.name.toUpperCase());

    bubbleHtml.append('div')
      .style('font-size', d => `${Math.max(8, d.radius * (isMobile ? 0.22 : 0.25))}px`)
      .style('font-weight', '600')
      .style('color', 'white')
      .style('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.8)')
      .style('text-align', 'center')
      .style('z-index', '3')
      .style('line-height', '1')
      .text(d => viewMode === 'frequency' ? `${d.frequency}x` : `$${d.totalSpent.toFixed(0)}`);

    bubbleGroups
      .on('mouseenter', function(event, d) {
        d3.select(this).style('cursor', 'pointer');
        
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
          .text(`Total spent: $${d.totalSpent.toFixed(2)}`);
        
        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', 25)
          .attr('fill', '#ccc')
          .attr('font-size', isMobile ? '8' : '9')
          .attr('font-weight', '500')
          .text(`Avg: $${(d.totalSpent / d.frequency).toFixed(2)} per purchase`);
      })
      .on('mouseleave', function(event, d) {
        container.select('.tooltip').remove();
      });

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

    bubbleGroups.on('click', function(event, d) {
      d3.select(this).select('div')
        .style('transform', 'scale(1.2)')
        .transition()
        .duration(300)
        .style('transform', 'scale(1)');
    });

    simulation.on('tick', () => {
      const stuckThreshold = 5;

      nodes.forEach(d => {
        const nearTopLeft = d.x < 50 && d.y < 50;
        const tooStill = Math.abs(d.vx) + Math.abs(d.vy) < 0.1;

        if (nearTopLeft && tooStill) {
          // Force kick out of top-left
          d.vx = (Math.random() - 0.5) * stuckThreshold;
          d.vy = (Math.random() - 0.5) * stuckThreshold;
          d.x = 100 + Math.random() * 100;
          d.y = 100 + Math.random() * 100;
        }
      });

      if (isMobile) {
        const safeMargin = 8;
        nodes.forEach(d => {
          d.x = Math.max(d.radius + safeMargin, Math.min(width - d.radius - safeMargin, d.x));
          d.y = Math.max(d.radius + safeMargin, Math.min(height - d.radius - safeMargin, d.y));
        });
      }

      bubbleGroups.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    const restartInterval = isMobile ? 4000 : 2000;
    const keepAlive = setInterval(() => {
      const targetAlpha = isMobile ? 0.2 : 0.4;
      
      if (simulation.alpha() < 0.05) {
        simulation.alphaTarget(targetAlpha).restart();
        setTimeout(() => simulation.alphaTarget(0.1), restartInterval / 2);
      }
    }, restartInterval);

    return () => {
      simulation.stop();
      clearInterval(keepAlive); 
    };
  }, [itemData, viewMode, dimensions, loading, error, isMobile]);

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
          <p>Loading popular items...</p>
          {isDemoMode && (
            <small style={{ color: '#ccc' }}>
              {isAuthenticated ? 'Loading your saved items...' : 'Processing demo data...'}
            </small>
          )}
        </div>
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
        <h3>Error Loading Item Data</h3>
        <p>{error}</p>
        {!isDemoMode ? (
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
        ) : (
          <p style={{ color: '#666', fontSize: '0.9em' }}>
            Demo mode: Try uploading receipts to see popular items
          </p>
        )}
      </div>
    );
  }
  
  if (itemData.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        background: isDemoMode ? '#e6f3ff' : '#f8f9fa',
        border: '1px solid #b3d9ff',
        borderRadius: '1rem',
        color: '#0066cc',
        textAlign: 'center'
      }}>
        <h5>No Popular Items Yet</h5>
        <p className="mb-0">
          {isDemoMode 
            ? isAuthenticated
              ? "Upload some receipts to see your most frequently purchased items as interactive bubbles."
              : "Upload receipts to see popular items, or sign in to save your data permanently."
            : "Upload some receipts to see your most frequently purchased items as interactive bubbles."
          }
        </p>
        {isDemoMode && !isAuthenticated && (
          <small style={{ color: '#666', marginTop: '0.5rem', display: 'block' }}>
            Demo Mode: Items will be shown temporarily during this session
          </small>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div 
        ref={containerRef}
        style={{ 
          position: 'relative',
          borderRadius: '1rem',
          overflow: 'hidden',
          background: '#2c2f36',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          height: isMobile ? '65vh' : '68vh',
          minHeight: isMobile ? '300px' : '500px'
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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PhysicsBubblesChart;
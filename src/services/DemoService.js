// DemoService.js - Handles all demo data loading and management
class DemoService {
  constructor() {
    this.demoData = [];
    this.isLoaded = false;
  }

  // Load demo data from local JSON file
  async loadDemoData() {
    try {
      console.log('[DEMO] Loading demo data from /data/receipts.json...');
      
      // Load the receipts.json from public/data/
      const response = await fetch('/data/receipts.json');
      if (!response.ok) {
        throw new Error(`Failed to load demo data: ${response.status} ${response.statusText}`);
      }
      
      const demoReceipts = await response.json();
      
      console.log('[DEMO] Loaded raw demo data:', Object.keys(demoReceipts).length, 'receipts');
      
      // Transform to match API format
      const transformedData = this.transformDemoData(demoReceipts);
      
      this.demoData = transformedData;
      this.isLoaded = true;
      
      console.log('[DEMO] Demo data transformation complete:', transformedData.length, 'receipts');
      
      return transformedData;
    } catch (error) {
      console.error('[DEMO] Failed to load demo data:', error);
      throw new Error(`Demo data loading failed: ${error.message}`);
    }
  }

  // Transform raw JSON data to match API format
  transformDemoData(demoReceipts) {
    return Object.entries(demoReceipts).map(([key, receipt]) => {
      // Generate image path - check if image exists
      const imagePath = this.getImagePath(key, receipt.ImageFileName);
      
      return {
        imageName: key,
        displayName: receipt.ImageFileName || key,
        receiptInfo: {
          ...receipt,
          HashIdentifier: key,
          ImageFileName: receipt.ImageFileName || key,
          ImageUrl: imagePath
        },
        isDemo: true,
        source: 'demo'
      };
    });
  }

  // Generate image path with fallback
  getImagePath(key, imageFileName) {
    // Try multiple possible image paths
    const possiblePaths = [
      `/data/images/${key}`,
      `/data/images/${imageFileName}`,
      `/data/images/${key}.jpg`,
      `/data/images/${key}.jpeg`,
      `/data/images/${key}.png`
    ];
    
    // For now, return the first option
    // In a real implementation, you might want to check if the image exists
    return possiblePaths[0];
  }

  // Get demo data (load if not already loaded)
  async getDemoData() {
    if (!this.isLoaded) {
      await this.loadDemoData();
    }
    return this.demoData;
  }

  // Get demo statistics
  getDemoStats() {
    if (!this.isLoaded) {
      return { totalReceipts: 0, totalSpent: 0, categories: {}, dateRange: null };
    }

    const stats = {
      totalReceipts: this.demoData.length,
      totalSpent: 0,
      categories: {},
      dateRange: { earliest: null, latest: null }
    };

    this.demoData.forEach(receipt => {
      const receiptInfo = receipt.receiptInfo;
      const total = receiptInfo.ProvidedTotal || receiptInfo.CalculatedTotal || 0;
      stats.totalSpent += total;

      // Category analysis
      if (receiptInfo.Items) {
        receiptInfo.Items.forEach(item => {
          const category = item.Category || 'Other';
          stats.categories[category] = (stats.categories[category] || 0) + item.Price;
        });
      }

      // Date range analysis
      if (receiptInfo.Date) {
        if (!stats.dateRange.earliest || receiptInfo.Date < stats.dateRange.earliest) {
          stats.dateRange.earliest = receiptInfo.Date;
        }
        if (!stats.dateRange.latest || receiptInfo.Date > stats.dateRange.latest) {
          stats.dateRange.latest = receiptInfo.Date;
        }
      }
    });

    return stats;
  }

  // Check if an image exists (placeholder for future implementation)
  async checkImageExists(imagePath) {
    try {
      const response = await fetch(imagePath, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Get demo data filtered by date range
  getDemoDataByDateRange(startDate, endDate) {
    if (!this.isLoaded) return [];
    
    return this.demoData.filter(receipt => {
      const receiptDate = receipt.receiptInfo.Date;
      if (!receiptDate) return false;
      
      const isAfterStart = !startDate || receiptDate >= startDate;
      const isBeforeEnd = !endDate || receiptDate <= endDate;
      
      return isAfterStart && isBeforeEnd;
    });
  }

  // Search demo data
  searchDemoData(searchTerm) {
    if (!this.isLoaded || !searchTerm) return this.demoData;
    
    const term = searchTerm.toLowerCase();
    
    return this.demoData.filter(receipt => {
      const receiptInfo = receipt.receiptInfo;
      
      // Search in receipt filename
      if (receipt.displayName?.toLowerCase().includes(term)) return true;
      
      // Search in items
      if (receiptInfo.Items) {
        return receiptInfo.Items.some(item => 
          item.ProductName?.toLowerCase().includes(term) ||
          item.CasualName?.toLowerCase().includes(term) ||
          item.Category?.toLowerCase().includes(term)
        );
      }
      
      return false;
    });
  }

  // Get demo data formatted for different components
  getFormattedDataForComponent(componentType) {
    switch (componentType) {
      case 'dashboard':
        return {
          receipts: this.demoData,
          stats: this.getDemoStats()
        };
      
      case 'history':
        return this.demoData.map(receipt => ({
          ...receipt,
          canEdit: false, // Demo receipts are read-only
          canDelete: false
        }));
      
      case 'analytics':
        return this.transformForAnalytics();
      
      default:
        return this.demoData;
    }
  }

  // Transform demo data for analytics components
  transformForAnalytics() {
    const itemStats = {};
    const categoryStats = {};
    const spendingTrends = {};

    this.demoData.forEach(receipt => {
      const receiptInfo = receipt.receiptInfo;
      const date = receiptInfo.Date;
      const total = receiptInfo.ProvidedTotal || receiptInfo.CalculatedTotal || 0;

      // Spending trends by date
      spendingTrends[date] = (spendingTrends[date] || 0) + total;

      // Item and category analysis
      if (receiptInfo.Items) {
        receiptInfo.Items.forEach(item => {
          const itemName = item.CasualName || item.ProductName || 'Unknown';
          const category = item.Category || 'Other';

          // Item frequency
          if (!itemStats[itemName]) {
            itemStats[itemName] = { name: itemName, frequency: 0, totalSpent: 0 };
          }
          itemStats[itemName].frequency++;
          itemStats[itemName].totalSpent += item.Price;

          // Category totals
          categoryStats[category] = (categoryStats[category] || 0) + item.Price;
        });
      }
    });

    return {
      items: Object.values(itemStats),
      categories: Object.entries(categoryStats).map(([name, value]) => ({ name, value })),
      trends: Object.entries(spendingTrends).map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  // Reset demo service
  reset() {
    this.demoData = [];
    this.isLoaded = false;
  }
}

// Export singleton instance
const demoService = new DemoService();
export default demoService;
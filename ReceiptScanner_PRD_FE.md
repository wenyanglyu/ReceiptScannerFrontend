# 🧾 ReceiptScanner - Product Requirements Document

This PRD outlines the front-end architecture, key components, and workflows for the ReceiptScanner web application. The project is built using **React**, **Bootstrap**, and supports **receipt image upload**, **OCR-based item extraction**, **editing**, **dashboard visualization**, and **history tracking**.

---

## 📁 Project Structure

```
ReceiptScanner/
├── App.js                     # Main app navigation and tab rendering logic
├── index.js                  # React root entry
├── components/
│   ├── ImageUploader.js       # Upload component with preview and progress
│   ├── JsonDisplay.js         # Editable JSON-based receipt viewer/editor
│   ├── Dashboard.js           # Analytics dashboard container
│   ├── ItemBubblesChart.js    # Animated item frequency bubble chart
│   ├── CategoryPieChart.js    # Category pie chart with word cloud
│   ├── ChartRenderer.js       # Line/Bar chart for trends
│   └── ReceiptHistory.js      # Historical receipts listing (not provided)
```

---

## 🧠 Functional Overview

### App.js
- Manages global state (`receiptData`, `activeTab`, `error`).
- Routes between:
  - Upload tab → `ImageUploader`
  - Edit tab → `JsonDisplay`
  - Dashboard tab → `Dashboard`
  - History tab → `ReceiptHistory`
- API base: `https://receiptscannerbackend.onrender.com/api`

---

## 📤 ImageUploader.js
- Uploads image to `/receipt/upload`
- Features:
  - Drag-and-drop and file input
  - File size validation (<10MB)
  - Preview image before uploading
  - Progress bar with processing phases
  - Robust error handling (timeout, unsupported formats, etc.)
- On success: updates `receiptData` for editing

---

## 📝 JsonDisplay.js
- Editable receipt UI
- Supports:
  - Inline editing (table mode)
  - Mobile-friendly cards (card mode)
  - Add/delete item
  - Inline edit modal on mobile
- Saving:
  - POSTs cleaned and parsed item data to `/Receipt/save-as-file`
  - Supports real-time currency formatting and total calculation
- Fields: `productName`, `casualName`, `price`, `quantity`, `unit`, `category`

---

## 📊 Dashboard.js
- Desktop view:
  - Shows two charts stacked vertically
- Mobile view:
  - Toggle tab between:
    - 🫧 Bubbles: `ItemBubblesChart`
    - 📈 Trends: `SpendingTrends` (inferred from ChartRenderer)
- Responsive layout based on `window.innerWidth`

---

## 🫧 ItemBubblesChart.js
- D3-powered physics simulation of item purchase frequency
- Features:
  - Animated floating bubbles
  - Data from `/Receipt/stats/items`
  - Bubble size scales with frequency or total spent
  - Tooltips show name, frequency, total, and average per purchase
- Mobile-friendly with dynamic resizing
- Elegant glassy bubble designs with gradients and shadows

---

## 🥧 CategoryPieChart.js
- Uses `recharts` and `@visx/wordcloud`
- Features:
  - Pie chart of spending by category (`/Receipt/stats/categories`)
  - Word cloud from frequent casual names (`/receipt`)
  - Responsive layout using Bootstrap grid
- Colors from a 10-color palette

---

## 📈 ChartRenderer.js
- Recharts-based line/bar chart component
- Props:
  - `trendsData`, `chartType`, `timeView`, `averageSpending`
- Displays:
  - Amount trends over time
  - X-axis formatting changes with view
  - Y-axis scales dynamically
  - Reference line for average
  - Tooltip with receipt count or vendor

---

## 🌐 API Integration

- All components rely on API: `https://receiptscannerbackend.onrender.com/api`
- Endpoints:
  - `POST /receipt/upload`
  - `POST /Receipt/save-as-file`
  - `GET /Receipt` (fetch history)
  - `GET /Receipt/stats/categories`
  - `GET /Receipt/stats/items`

---

## 🧩 Design Highlights

- Mobile-first design: switches between table/card view based on width
- Modular React components: isolated, styled, maintainable
- Bootstrap for layout & components
- D3 + Recharts + VisX for visualization

---

## 📦 Dependencies
- React 18
- Bootstrap 5
- Recharts
- D3
- @visx/wordcloud
- Axios

---

## ✅ Future Improvements
- Add `ReceiptHistory.js` UI
- Export to PDF/CSV
- Editable category presets
- Category auto-suggestions via NLP
- Time filtering on dashboard



---

## 🗂 ReceiptHistory.js
- Fetches and displays a list of previously uploaded receipts
- View modes:
  - 📱 Cards (mobile)
  - 🖥️ Table (desktop)
- Features:
  - Filter by date range or store name
  - Sort by date, item count, or total amount
  - View receipt details with item breakdown and preview image
  - Select and delete one or more receipts (`POST /Receipt/delete-multiple`)
  - Launch edit mode via `onEditReceipt(receipt)`
- Responsive layout with automatic view switching
- Advanced error handling and retry support

---

## 📉 SpendingTrends.js
- Visualizes spending over time using a bar chart
- View modes:
  - Receipt-level
  - Weekly
  - Monthly
  - Yearly
- Key Features:
  - Fetches data from `/Receipt/stats/trends`
  - Displays average and highest period metrics
  - Toggle average line
  - Optimized for mobile and desktop separately
  - Uses custom responsive SVG chart with animated bars


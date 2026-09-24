# 📦 SwiftTrack - Real-Time Single-Page Order Tracking & Logistics Management

![Python](https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0%2B-green?logo=flask&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Supported-brightgreen?logo=mongodb&logoColor=white)
![Leaflet.js](https://img.shields.io/badge/Map-Leaflet.js-orange?logo=leaflet&logoColor=white)
![Theme](https://img.shields.io/badge/Theme-White%20%2B%20Warm%20Amber-amber)

**SwiftTrack** is a modern, responsive Single-Page Application (SPA) for e-commerce and logistics order fulfillment and tracking. Built with Flask, Vanilla CSS, and JavaScript, it features interactive map routing, dynamic QR codes, secure OTP-gated delivery verification, and post-delivery customer reviews.

---

## ✨ Key Features

- 👤 **Customer Portal**:
  - **Live Order Placement**: Submit new orders with instant validation and auto-generated tracking IDs (`ORD1001`, `ORD1002`, etc.).
  - **Visual 6-Step Stepper**: Real-time progress bar from *Order Placed* → *Confirmed* → *Packed* → *Shipped* → *Out for Delivery* → *Delivered*.
  - **🗺️ Interactive Logistics Map (Leaflet.js + OpenStreetMap)**: Live radar showing origin warehouse, intermediate transit checkpoints, pulsing live beacon, and destination with polyline route curves (100% free, zero API keys required).
  - **📲 Dynamic QR Code Pass (qrcode.js)**: Auto-generated mobile QR code for quick scanning and deep-linked tracking (`/?track=ORD...`).
  - **🔑 4-Digit Secure Delivery OTP**: Unique customer verification PIN displayed securely for physical package handover.
  - **📄 Printable Receipt / Invoice**: One-click printable receipt modal with full line-item breakdowns.
  - **⭐ Post-Delivery 5-Star Reviews**: Interactive review and feedback form unlocked automatically upon package delivery.

- 🛡️ **Admin Management Console**:
  - **🔐 PIN-Protected Access**: Secure administrator login (Default: `admin123`).
  - **📊 Live Operational Metrics**: Real-time counters for Total, Pending, In-Transit, and Delivered shipments.
  - **⚡ Real-Time Status & Hub Dispatcher**: Update shipment status and checkpoint hubs.
  - **🔒 OTP Verification Delivery Gate**: Prevents marking an order as *Delivered* unless the customer's 4-digit PIN is verified.
  - **⚙️ Configurable System Settings**: Update administrator security PIN and manage delivery hub names dynamically.
  - **📥 Instant CSV Export**: Download complete order and review registries into structured CSV spreadsheets.

- 💾 **Dual-Mode Persistence**:
  - Automatically connects to **MongoDB / MongoDB Atlas** if available.
  - Includes a zero-setup **Persistent JSON Disk Storage** (`backend/data/orders.json`), allowing the entire application to run seamlessly with full data retention even without MongoDB installed!

---

## 📁 Project Structure

```text
order-tracking/
├── backend/
│   ├── app.py              # Flask server, API endpoints & persistence engine
│   ├── requirements.txt    # Python dependencies
│   └── data/               # Persistent JSON storage (orders.json, settings.json)
├── frontend/
│   ├── templates/
│   │   └── index.html      # Single-page HTML architecture
│   └── static/
│       ├── css/
│       │   └── style.css   # Custom responsive White + Warm Amber design system
│       └── js/
│           └── app.js      # Frontend logic, Leaflet map, QR generator & API sync
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ installed
- Git

### 2. Clone the Repository
```bash
git clone https://github.com/<your-username>/order-tracking.git
cd order-tracking
```

### 3. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```

### 5. Access the Web App
Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 🔑 Default Credentials & Demo IDs

| Portal / Feature | Value |
| :--- | :--- |
| **Admin Security PIN** | `admin123` |
| **Demo Order 1 (In Transit)** | `ORD1001` (OTP: `4821`) |
| **Demo Order 2 (Delivered)** | `ORD1002` (OTP: `7392`) |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Renders Single-Page Web Application |
| `POST` | `/api/orders` | Create new order (Generates 4-digit OTP & estimated delivery) |
| `GET` | `/api/orders/<order_id>/track` | Retrieve full tracking history & status |
| `PUT` | `/api/orders/<order_id>/cancel` | Cancel order (valid only in *Order Placed* status) |
| `POST` | `/api/orders/<order_id>/review` | Submit 5-star customer review & comment |
| `POST` | `/api/admin/verify-pin` | Verify administrator security PIN |
| `GET` | `/api/admin/orders` | Get all orders (supports `?status=` filtering) |
| `PUT` | `/api/admin/orders/<order_id>/status` | Update order status (Requires OTP for *Delivered*) |
| `GET` | `/api/admin/metrics` | Aggregate order count breakdown |
| `GET` | `/api/admin/settings` | Retrieve system settings & dispatch hubs |
| `PUT` | `/api/admin/settings` | Update security PIN & active delivery hubs |
| `GET` | `/api/admin/export` | Download full order log as a CSV spreadsheet |

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

# 📦 SwiftTrack - Real-Time Order Tracking & Logistics Platform

A full-stack, enterprise-grade logistics fulfillment and order tracking platform built with **Python Flask**, **MongoDB / JSON Fallback**, **Leaflet.js**, **JavaScript (ES6)**, and **HTML5/CSS3**.

---

## 🌟 Key Features

### Authentication & Role-Based Access Control:
- **Admin Login** with secure PIN-based authentication (`admin123`).
- Role-protected administrative routes for dispatch management and operations control.
- Customer self-service portal requiring no authentication for real-time tracking via unique Order IDs.

### Customer Tracking & Fulfillment Module:
- Real-time 6-stage milestone tracker (*Order Placed* → *Confirmed* → *Packed* → *Shipped* → *Out for Delivery* → *Delivered*).
- Instant order cancellation workflow available exclusively during the initial *Order Placed* status.
- Secure auto-generated 4-digit Delivery OTP attached to every consignment for physical handover verification.
- Printable order invoices with price breakdowns, taxes, shipping costs, and print-optimized CSS layout.
- Dynamic client-side QR Code pass generation (`qrcode.js`) encoding direct tracking URLs (`/?track=ORD...`).

### Geospatial Radar & Interactive Mapping:
- Zero-API-key interactive routing powered by **Leaflet.js** and **OpenStreetMap**.
- Real-time waypoint plotting: Origin Warehouses (🏭), Sorting Hubs (🚚), Destination Addresses (🏠), and Live Delivery Couriers (📍) with pulsating radar animations.
- Dynamic polyline route curve generation linking origin and destination coordinates.

### Operations & Logistics Management:
- Real-time operations counters: Total Orders, Pending/Processing, In-Transit, and Delivered.
- Live status dispatcher allowing warehouse operators to push state updates and hub locations instantly.
- Strict OTP verification barrier: Couriers and administrators cannot transition an order to *Delivered* without entering the customer's matching 4-digit PIN.
- Dispatch hub manager to dynamically configure active fulfillment hubs and update administrator access PINs.
- One-click bulk export of order logs, timestamps, OTPs, and reviews into structured `.csv` files.

### Dual-Engine Intelligent Persistence:
- Direct support for local MongoDB instances and cloud-hosted MongoDB Atlas via `MONGO_URI`.
- Zero-setup local disk fallback using `mongomock` and JSON file persistence (`backend/data/orders.json` & `backend/data/settings.json`) when no database engine is installed.

### Post-Delivery Feedback Module:
- In-app feedback form revealed automatically upon successful package delivery.
- 5-star customer rating system and qualitative comment submission stored directly in the database.

---

## 📂 Project Structure

```text
order-tracking-/
│── backend/
│   ├── app.py              # Main Flask application, REST APIs & logic
│   ├── requirements.txt    # Backend Python dependencies
│   └── data/               # Persistent disk fallback storage
│       ├── orders.json     # Serialized order entries
│       └── settings.json   # Configuration and active hub records
│── frontend/
│   ├── templates/
│   │   └── index.html      # Master SPA layout, modals, map & timeline
│   └── static/
│       ├── css/
│       │   └── style.css   # Custom warm amber styling, tokens & components
│       └── js/
│           └── app.js      # Client controller, Leaflet map engine & QR generator
│── .gitignore              # Git ignore configuration
│── LICENSE                 # Project license file
└── README.md               # Project documentation & instructions
```

---

## 💻 Installation & Setup

### Prerequisites
- Python 3.10+ installed.
- MongoDB Server *(Optional, automatic local JSON persistence fallback included for development)*.

### 1. Clone / Extract Repository
Ensure you are in the project root directory:
```bash
git clone https://github.com/shyamsundarmd19-hub/order-tracking-.git
cd order-tracking-
```

### 2. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```
Or on Windows:
```bash
py -3 -m pip install -r requirements.txt
```

### 3. Database Setup

#### Option A: MongoDB Cloud / Local Server (Production Mode)
Set the MongoDB connection string using environment variables:
```bash
export MONGO_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority"
```
Or for local instances:
```bash
export MONGO_URI="mongodb://localhost:27017/"
```

#### Option B: Automatic In-Memory & JSON Fallback (Development / Out-of-the-Box Mode)
If a local or remote MongoDB instance is not detected, the system automatically initializes a virtual database via `mongomock` paired with auto-saving JSON storage at `backend/data/orders.json` and `backend/data/settings.json`, ensuring zero data loss across server restarts without manual database installation.

### 4. Run the Application
```bash
python app.py
```
Open your browser and visit: **http://127.0.0.1:5000**

---

## 🌐 Live Demo
- **Repository URL:** [https://github.com/shyamsundarmd19-hub/order-tracking-](https://github.com/shyamsundarmd19-hub/order-tracking-)
- **Live Local Access:** [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🔑 Default Accounts & Sample Tracking Data (Created Automatically)

| Role / Entity | Identifier | Default Password / OTP | Features Accessible |
| :--- | :--- | :--- | :--- |
| **Administrator** | `Admin Portal` | `admin123` | Operations Dashboard, Status Dispatcher, Delivery Verification, Settings, CSV Export |
| **In-Transit Order** | `ORD1001` | OTP: `4821` | Live route rendering on interactive radar map, dynamic QR code pass |
| **Delivered Order** | `ORD1002` | OTP: `7392` | Completed milestone history, verified 5-star customer review display |
| **New Orders** | Auto-Generated (`ORD1003`+) | Unique 4-digit PIN | Instant placement, live tracking, order cancellation |

---

## 🔒 Security Best Practices Implemented

- **OTP Handover Verification**: Prevents unauthorized order completion by enforcing matching OTP inputs during courier delivery.
- **PIN-Protected Admin Console**: Critical state transitions and hub settings restricted behind administrative authentication.
- **CORS Negotiation**: Managed through `Flask-CORS` to prevent unauthorized cross-origin data extraction.
- **Client-Side Sanitization**: Input validation across forms to prevent malformed data persistence in JSON/Mongo records.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/shyamsundarmd19-hub">Shyam Sundar</a></sub>
</div>

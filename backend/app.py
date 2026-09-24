import os
import io
import csv
import json
import random
from datetime import datetime, timezone, timedelta
from flask import Flask, jsonify, request, render_template, Response
from flask_cors import CORS
from pymongo import MongoClient, DESCENDING
from pymongo.errors import PyMongoError

app = Flask(
    __name__,
    template_folder="../frontend/templates",
    static_folder="../frontend/static"
)
CORS(app)

# MongoDB Connection Configuration (Supports MongoDB Atlas URI or Local MongoDB)
MONGO_URI = os.getenv("MONGO_URI", os.getenv("MONGODB_URI", "mongodb://localhost:27017/"))
DATABASE_NAME = "order_tracking_db"
COLLECTION_NAME = "orders"
SETTINGS_COLLECTION_NAME = "settings"

# Persistent JSON File Storage Paths
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
ORDERS_FILE = os.path.join(DATA_DIR, "orders.json")
SETTINGS_FILE = os.path.join(DATA_DIR, "settings.json")
IS_MOCK = False

DEFAULT_SETTINGS = {
    "setting_id": "app_config",
    "admin_pin": "admin123",
    "delivery_hubs": [
        "Warehouse - Central Hub",
        "Regional Sorting Facility - North",
        "Regional Sorting Facility - South",
        "Air Cargo Express Terminal",
        "Metro Dispatch & Fulfillment Hub",
        "Local Delivery Center"
    ]
}


def save_data_to_disk():
    """
    Persists current orders and settings to JSON files in backend/data/.
    Ensures that data is NEVER lost across server restarts when running without live MongoDB.
    """
    if not IS_MOCK:
        return
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        # Save orders
        all_orders = list(orders_collection.find({}, {"_id": 0}))
        with open(ORDERS_FILE, "w", encoding="utf-8") as f:
            json.dump(all_orders, f, indent=2, ensure_ascii=False)
        
        # Save settings
        config = settings_collection.find_one({"setting_id": "app_config"}, {"_id": 0})
        if config:
            with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[!] Warning: Failed to persist data to disk: {e}")


def load_data_from_disk():
    """
    Loads saved orders and settings from JSON files on disk into the database.
    """
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        # Load settings
        if os.path.exists(SETTINGS_FILE):
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)
                if config:
                    settings_collection.replace_one({"setting_id": "app_config"}, config, upsert=True)
        elif not settings_collection.find_one({"setting_id": "app_config"}):
            settings_collection.insert_one(DEFAULT_SETTINGS.copy())

        # Load orders
        if os.path.exists(ORDERS_FILE):
            with open(ORDERS_FILE, "r", encoding="utf-8") as f:
                saved_orders = json.load(f)
                if isinstance(saved_orders, list) and len(saved_orders) > 0:
                    orders_collection.delete_many({})
                    orders_collection.insert_many(saved_orders)
                    print(f"[*] Loaded {len(saved_orders)} persistent orders from {ORDERS_FILE}")
                    return True
    except Exception as e:
        print(f"[!] Error loading persistent data from disk: {e}")
    return False


# Database Connection Initialization
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
    # Validate connection with ping
    client.admin.command("ping")
    db = client[DATABASE_NAME]
    orders_collection = db[COLLECTION_NAME]
    settings_collection = db[SETTINGS_COLLECTION_NAME]
    IS_MOCK = False
    print(f"[*] MongoDB connection established successfully on {MONGO_URI}")
except Exception as conn_err:
    print(f"[!] Live MongoDB server not reachable ({conn_err}). Initializing persistent fallback database.")
    try:
        import mongomock
        client = mongomock.MongoClient()
        db = client[DATABASE_NAME]
        orders_collection = db[COLLECTION_NAME]
        settings_collection = db[SETTINGS_COLLECTION_NAME]
        IS_MOCK = True

        # Load existing data from disk if present
        has_existing_orders = load_data_from_disk()

        # Seed initial demonstration orders only if no previous data exists on disk
        if not has_existing_orders and orders_collection.count_documents({}) == 0:
            now_dt = datetime.now(timezone.utc)
            now_iso = now_dt.isoformat()
            est_iso = (now_dt + timedelta(days=3)).isoformat()
            
            orders_collection.insert_many([
                {
                    "order_id": "ORD1001",
                    "customer_name": "Sarah Jenkins",
                    "product_name": "Logitech MX Master 3S Mouse",
                    "price": 99.99,
                    "quantity": 1,
                    "total_amount": 99.99,
                    "current_status": "In Transit",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "estimated_delivery": est_iso,
                    "delivery_otp": "4821",
                    "tracking_history": [
                        {"status": "Order Placed", "location": "Warehouse - Central Hub", "timestamp": now_iso},
                        {"status": "Confirmed", "location": "Dispatch Station A", "timestamp": now_iso},
                        {"status": "In Transit", "location": "Regional Sorting Facility - North", "timestamp": now_iso}
                    ],
                    "review": None
                },
                {
                    "order_id": "ORD1002",
                    "customer_name": "Michael Chen",
                    "product_name": "Apple MacBook Pro 16",
                    "price": 2499.00,
                    "quantity": 1,
                    "total_amount": 2499.00,
                    "current_status": "Delivered",
                    "created_at": now_iso,
                    "updated_at": now_iso,
                    "estimated_delivery": est_iso,
                    "delivery_otp": "7392",
                    "tracking_history": [
                        {"status": "Order Placed", "location": "Warehouse - West Hub", "timestamp": now_iso},
                        {"status": "Confirmed", "location": "Quality Check Center", "timestamp": now_iso},
                        {"status": "Packed", "location": "Packaging Unit 3", "timestamp": now_iso},
                        {"status": "Shipped", "location": "Air Cargo Express Terminal", "timestamp": now_iso},
                        {"status": "Out for Delivery", "location": "Local Delivery Center", "timestamp": now_iso},
                        {"status": "Delivered", "location": "Delivered to Front Door", "timestamp": now_iso}
                    ],
                    "review": {
                        "rating": 5,
                        "comment": "Super fast delivery! Package was securely boxed and arrived in pristine condition.",
                        "submitted_at": now_iso
                    }
                }
            ])
            save_data_to_disk()
            print("[*] Seeded initial demo orders ORD1001 and ORD1002.")
    except Exception as mock_err:
        print(f"[!] Error setting up persistent database: {mock_err}")


def serialize_doc(doc):
    """Safely converts MongoDB document ObjectId and date fields for JSON response."""
    if not doc:
        return None
    if "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


def get_current_settings():
    """Fetches system settings from database with graceful fallback to defaults."""
    try:
        config = settings_collection.find_one({"setting_id": "app_config"}, {"_id": 0})
        if config:
            return config
    except Exception:
        pass
    return DEFAULT_SETTINGS.copy()


def generate_next_order_id():
    """
    Generates sequential Order ID in the format ORD1001, ORD1002, etc.
    Finds the highest existing ORD number and increments it.
    """
    try:
        last_order = orders_collection.find_one(
            {"order_id": {"$regex": r"^ORD\d+$"}},
            sort=[("order_id", DESCENDING)]
        )
        if last_order and "order_id" in last_order:
            numeric_part = int(str(last_order["order_id"]).replace("ORD", ""))
            return f"ORD{numeric_part + 1}"
    except Exception:
        pass

    count = orders_collection.count_documents({})
    return f"ORD{1001 + count}"


@app.route("/", methods=["GET"])
def index():
    """Renders the single-page application interface."""
    return render_template("index.html")


@app.route("/api/orders", methods=["POST"])
def create_order():
    """
    Creates a new order.
    Calculates estimated delivery date (+3 days) and 4-digit Delivery Verification OTP.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid or missing JSON payload"}), 400

    customer_name = data.get("customer_name")
    product_name = data.get("product_name")
    price = data.get("price")
    quantity = data.get("quantity")

    if not customer_name or not product_name or price is None or quantity is None:
        return jsonify({
            "error": "Missing required fields: customer_name, product_name, price, and quantity are mandatory."
        }), 400

    try:
        price = float(price)
        quantity = int(quantity)
        if price < 0 or quantity <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Price must be non-negative and quantity must be a positive integer."}), 400

    order_id = generate_next_order_id()
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    estimated_delivery_iso = (now_dt + timedelta(days=3)).isoformat()
    location = str(data.get("location", "Warehouse - Central Hub")).strip()
    
    # 4-Digit Secure Delivery OTP
    delivery_otp = f"{random.randint(1000, 9999)}"

    initial_event = {
        "status": "Order Placed",
        "location": location,
        "timestamp": now_iso
    }

    new_order = {
        "order_id": order_id,
        "customer_name": str(customer_name).strip(),
        "product_name": str(product_name).strip(),
        "price": price,
        "quantity": quantity,
        "total_amount": round(price * quantity, 2),
        "current_status": "Order Placed",
        "created_at": now_iso,
        "updated_at": now_iso,
        "estimated_delivery": estimated_delivery_iso,
        "delivery_otp": delivery_otp,
        "tracking_history": [initial_event],
        "review": None
    }

    try:
        orders_collection.insert_one(new_order)
        save_data_to_disk()
        return jsonify({
            "success": True,
            "message": "Order placed successfully",
            "order": serialize_doc(new_order)
        }), 201
    except PyMongoError as e:
        return jsonify({"error": "Failed to create order in database", "details": str(e)}), 500


@app.route("/api/orders/<order_id>/track", methods=["GET"])
def track_order(order_id):
    """
    Returns order details, estimated delivery, 4-digit OTP, and complete tracking history.
    """
    try:
        order = orders_collection.find_one({"order_id": order_id}, {"_id": 0})
        if not order:
            return jsonify({
                "error": "Order not found",
                "order_id": order_id
            }), 404

        # Auto-compute estimated_delivery if missing for legacy docs
        if not order.get("estimated_delivery") and order.get("created_at"):
            try:
                created_dt = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
                order["estimated_delivery"] = (created_dt + timedelta(days=3)).isoformat()
            except Exception:
                order["estimated_delivery"] = None

        # Auto-generate OTP for legacy docs if missing
        if not order.get("delivery_otp"):
            order["delivery_otp"] = "5829"

        return jsonify({
            "success": True,
            "order": order
        }), 200
    except PyMongoError as e:
        return jsonify({"error": "Database error while retrieving order", "details": str(e)}), 500


@app.route("/api/orders/<order_id>/cancel", methods=["PUT"])
def cancel_order(order_id):
    """
    Allows order cancellation ONLY if current_status is 'Order Placed'.
    """
    try:
        order = orders_collection.find_one({"order_id": order_id})
        if not order:
            return jsonify({"error": "Order not found", "order_id": order_id}), 404

        current_status = str(order.get("current_status", "")).strip()

        # Strict Cancellation Check
        if current_status.lower() != "order placed":
            return jsonify({
                "error": f"Cannot cancel order with status '{current_status}'. Orders can only be cancelled while in 'Order Placed' status."
            }), 400

        now_iso = datetime.now(timezone.utc).isoformat()
        cancel_event = {
            "status": "Cancelled",
            "location": "Customer Portal / Self-Service Cancellation",
            "timestamp": now_iso
        }

        orders_collection.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "current_status": "Cancelled",
                    "updated_at": now_iso
                },
                "$push": {
                    "tracking_history": cancel_event
                }
            }
        )
        save_data_to_disk()

        updated_order = orders_collection.find_one({"order_id": order_id}, {"_id": 0})
        return jsonify({
            "success": True,
            "message": f"Order {order_id} was successfully cancelled.",
            "order": updated_order
        }), 200

    except PyMongoError as e:
        return jsonify({"error": "Database error while cancelling order", "details": str(e)}), 500


@app.route("/api/orders/<order_id>/review", methods=["POST"])
def submit_order_review(order_id):
    """
    Submits 5-star customer review & feedback for a delivered order.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing review data"}), 400

    rating = data.get("rating")
    comment = str(data.get("comment", "")).strip()

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "Rating must be an integer between 1 and 5 stars."}), 400

    try:
        order = orders_collection.find_one({"order_id": order_id})
        if not order:
            return jsonify({"error": "Order not found"}), 404

        now_iso = datetime.now(timezone.utc).isoformat()
        review_doc = {
            "rating": rating,
            "comment": comment,
            "submitted_at": now_iso
        }

        orders_collection.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "review": review_doc,
                    "updated_at": now_iso
                }
            }
        )
        save_data_to_disk()

        return jsonify({
            "success": True,
            "message": "Thank you! Your feedback has been recorded.",
            "review": review_doc
        }), 200

    except PyMongoError as e:
        return jsonify({"error": "Database error saving review", "details": str(e)}), 500


@app.route("/api/admin/verify-pin", methods=["POST"])
def verify_admin_pin():
    """
    Verifies admin passcode against stored configuration.
    """
    data = request.get_json() or {}
    submitted_pin = str(data.get("pin", "")).strip()
    
    settings = get_current_settings()
    correct_pin = settings.get("admin_pin", "admin123")

    if submitted_pin and submitted_pin == correct_pin:
        return jsonify({"success": True, "message": "Authentication successful"}), 200
    else:
        return jsonify({"success": False, "error": "Invalid administrative PIN"}), 401


@app.route("/api/admin/settings", methods=["GET"])
def get_admin_settings():
    """
    Returns administrative settings including delivery hubs and admin PIN.
    """
    try:
        settings = get_current_settings()
        return jsonify({
            "success": True,
            "settings": settings
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch settings", "details": str(e)}), 500


@app.route("/api/admin/settings", methods=["PUT"])
def update_admin_settings():
    """
    Updates administrative settings (Admin Passcode & Delivery Hubs).
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing payload"}), 400

    new_pin = data.get("admin_pin")
    hubs = data.get("delivery_hubs")

    update_fields = {}
    if new_pin and str(new_pin).strip():
        update_fields["admin_pin"] = str(new_pin).strip()
    
    if isinstance(hubs, list) and len(hubs) > 0:
        clean_hubs = [str(h).strip() for h in hubs if str(h).strip()]
        if clean_hubs:
            update_fields["delivery_hubs"] = clean_hubs

    if not update_fields:
        return jsonify({"error": "No valid settings fields to update"}), 400

    try:
        settings_collection.update_one(
            {"setting_id": "app_config"},
            {"$set": update_fields},
            upsert=True
        )
        save_data_to_disk()

        updated = get_current_settings()
        return jsonify({
            "success": True,
            "message": "Settings updated successfully",
            "settings": updated
        }), 200
    except PyMongoError as e:
        return jsonify({"error": "Database error updating settings", "details": str(e)}), 500


@app.route("/api/admin/orders", methods=["GET"])
def get_all_orders():
    """
    Returns all orders sorted newest first.
    Supports optional ?status= query filter.
    """
    try:
        query = {}
        status_filter = request.args.get("status")
        if status_filter and status_filter.strip().lower() != "all":
            query["current_status"] = {"$regex": f"^{status_filter.strip()}$", "$options": "i"}

        orders_cursor = orders_collection.find(query, {"_id": 0}).sort("created_at", DESCENDING)
        orders = list(orders_cursor)
        return jsonify({
            "success": True,
            "count": len(orders),
            "orders": orders
        }), 200
    except PyMongoError as e:
        return jsonify({"error": "Database error while fetching orders", "details": str(e)}), 500


@app.route("/api/admin/orders/<order_id>/status", methods=["PUT"])
def update_order_status(order_id):
    """
    Updates current_status and uses MongoDB $push to append {status, location, timestamp} to tracking_history.
    Requires customer's 4-digit Delivery Verification OTP if status is 'Delivered'.
    """
    data = request.get_json()
    if not data or not data.get("status"):
        return jsonify({"error": "Field 'status' is required"}), 400

    new_status = str(data.get("status")).strip()
    location = str(data.get("location", "Hub / In-Transit Center")).strip()
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        existing_order = orders_collection.find_one({"order_id": order_id})
        if not existing_order:
            return jsonify({
                "error": "Order not found",
                "order_id": order_id
            }), 404

        # OTP Verification Gate for 'Delivered'
        if new_status.lower() == "delivered":
            submitted_otp = str(data.get("delivery_otp", "")).strip()
            actual_otp = str(existing_order.get("delivery_otp", "5829")).strip()

            if not submitted_otp or submitted_otp != actual_otp:
                return jsonify({
                    "error": f"Invalid Delivery OTP. Please enter the correct 4-digit verification PIN provided by the customer for {order_id}."
                }), 400

        new_event = {
            "status": new_status,
            "location": location,
            "timestamp": now_iso
        }

        orders_collection.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "current_status": new_status,
                    "updated_at": now_iso
                },
                "$push": {
                    "tracking_history": new_event
                }
            }
        )
        save_data_to_disk()

        return jsonify({
            "success": True,
            "message": f"Order {order_id} status updated to '{new_status}'",
            "order_id": order_id,
            "latest_event": new_event
        }), 200
    except PyMongoError as e:
        return jsonify({"error": "Database error while updating order status", "details": str(e)}), 500


@app.route("/api/admin/metrics", methods=["GET"])
def get_admin_metrics():
    """
    Aggregation pipeline returning total count and count breakdown per status.
    """
    try:
        pipeline = [
            {
                "$facet": {
                    "total_count": [
                        {"$count": "count"}
                    ],
                    "status_breakdown": [
                        {"$group": {"_id": "$current_status", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}}
                    ]
                }
            }
        ]

        result = list(orders_collection.aggregate(pipeline))

        if not result or not result[0]:
            return jsonify({
                "success": True,
                "total_orders": 0,
                "status_breakdown": {}
            }), 200

        data = result[0]
        total_orders = data["total_count"][0]["count"] if data.get("total_count") else 0
        status_breakdown = {
            item["_id"]: item["count"]
            for item in data.get("status_breakdown", [])
            if item.get("_id") is not None
        }

        return jsonify({
            "success": True,
            "total_orders": total_orders,
            "status_breakdown": status_breakdown
        }), 200
    except PyMongoError as e:
        return jsonify({"error": "Database error while computing metrics", "details": str(e)}), 500


@app.route("/api/admin/export", methods=["GET"])
def export_orders_csv():
    """
    Exports all orders into a downloadable CSV file.
    """
    try:
        orders = list(orders_collection.find({}, {"_id": 0}).sort("created_at", DESCENDING))
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write CSV Header
        writer.writerow([
            "Order ID",
            "Customer Name",
            "Product Name",
            "Unit Price ($)",
            "Quantity",
            "Total Amount ($)",
            "Current Status",
            "Delivery Verification OTP",
            "Created At (UTC)",
            "Estimated Delivery (UTC)",
            "Last Updated (UTC)",
            "Tracking Milestones Count",
            "Customer Rating",
            "Customer Review"
        ])

        for o in orders:
            rev = o.get("review") or {}
            writer.writerow([
                o.get("order_id", ""),
                o.get("customer_name", ""),
                o.get("product_name", ""),
                f"{o.get('price', 0):.2f}",
                o.get("quantity", 0),
                f"{o.get('total_amount', 0):.2f}",
                o.get("current_status", ""),
                o.get("delivery_otp", ""),
                o.get("created_at", ""),
                o.get("estimated_delivery", ""),
                o.get("updated_at", ""),
                len(o.get("tracking_history", [])),
                rev.get("rating", "N/A"),
                rev.get("comment", "")
            ])

        csv_content = output.getvalue()
        output.close()

        filename = f"swifttrack_orders_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
    except Exception as e:
        return jsonify({"error": "Failed to export orders to CSV", "details": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)

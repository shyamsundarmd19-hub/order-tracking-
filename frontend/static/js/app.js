/**
 * SwiftTrack - Single-Page Real-Time Order Tracking & Logistics Management System
 * Modular Vanilla JavaScript with Leaflet.js & QRCode.js integrations
 */

(function () {
    'use strict';

    // -------------------------------------------------------------------------
    // 1. Constants & Configuration
    // -------------------------------------------------------------------------
    const DEFAULT_ADMIN_PIN = "admin123";
    
    // Standard 6-Step Fulfillment Progression
    const ORDER_STEPS = [
        "Order Placed",
        "Confirmed",
        "Packed",
        "Shipped",
        "Out for Delivery",
        "Delivered"
    ];

    // Status Normalization mapping for flexible status strings
    const STATUS_NORMALIZATION_MAP = {
        "placed": "Order Placed",
        "order placed": "Order Placed",
        "confirmed": "Confirmed",
        "processing": "Confirmed",
        "packed": "Packed",
        "packaging": "Packed",
        "shipped": "Shipped",
        "in transit": "Shipped",
        "transit": "Shipped",
        "out for delivery": "Out for Delivery",
        "delivered": "Delivered",
        "completed": "Delivered",
        "cancelled": "Cancelled"
    };

    // Realistic Geographic Hub Coordinate Registry (Zero API Key)
    const HUB_COORDINATES = {
        "Warehouse - Central Hub": { lat: 41.8781, lng: -87.6298, name: "Central Fulfillment Hub (Chicago, IL)" },
        "Dispatch Station A": { lat: 41.9742, lng: -87.9073, name: "Dispatch Station A (O'Hare Gateway)" },
        "Regional Sorting Facility - North": { lat: 42.3601, lng: -71.0589, name: "Sorting Facility North (Boston, MA)" },
        "Regional Sorting Facility - South": { lat: 33.7490, lng: -84.3880, name: "Sorting Facility South (Atlanta, GA)" },
        "Air Cargo Express Terminal": { lat: 39.0438, lng: -77.4874, name: "Air Cargo Terminal (Dulles, VA)" },
        "Metro Dispatch & Fulfillment Hub": { lat: 40.7128, lng: -74.0060, name: "Metro Dispatch Hub (New York, NY)" },
        "Local Delivery Center": { lat: 40.7306, lng: -73.9352, name: "Local Courier Center (Brooklyn, NY)" },
        "Warehouse - West Hub": { lat: 34.0522, lng: -118.2437, name: "West Coast Hub (Los Angeles, CA)" },
        "Quality Check Center": { lat: 37.7749, lng: -122.4194, name: "Quality Check Center (San Francisco, CA)" },
        "Packaging Unit 3": { lat: 36.1699, lng: -115.1398, name: "Packaging Unit 3 (Las Vegas, NV)" },
        "Delivered to Front Door": { lat: 40.7589, lng: -73.9851, name: "Customer Destination Address" }
    };

    const RATING_LABELS = {
        1: "1 Star - Needs Improvement",
        2: "2 Stars - Fair Service",
        3: "3 Stars - Good & On Time",
        4: "4 Stars - Great Service",
        5: "5 Stars - Outstanding Experience! 🌟"
    };

    // Default Fallback Hubs
    let deliveryHubs = [
        "Warehouse - Central Hub",
        "Regional Sorting Facility - North",
        "Regional Sorting Facility - South",
        "Air Cargo Express Terminal",
        "Metro Dispatch & Fulfillment Hub",
        "Local Delivery Center"
    ];

    // State Store
    let allAdminOrders = [];
    let currentRole = 'customer'; // 'customer' | 'admin'
    let currentActiveOrder = null;
    let localHubsList = [...deliveryHubs];
    let selectedRating = 5;
    let pendingDeliveryOrder = null; // { orderId, newStatus, hubLocation }

    // Leaflet Map & QR Objects
    let logisticsMap = null;
    let mapLayerGroup = null;

    // -------------------------------------------------------------------------
    // 2. DOM Elements Cache
    // -------------------------------------------------------------------------
    const DOM = {
        // Navigation
        navBtnCustomer: document.getElementById('nav-btn-customer'),
        navBtnAdmin: document.getElementById('nav-btn-admin'),
        navBtnLogout: document.getElementById('nav-btn-logout'),

        // View Panels
        customerView: document.getElementById('customer-view'),
        adminView: document.getElementById('admin-view'),

        // Admin Auth Modal
        adminModal: document.getElementById('admin-modal'),
        adminLoginForm: document.getElementById('admin-login-form'),
        adminPinInput: document.getElementById('admin-pin'),
        btnCancelAdminModal: document.getElementById('btn-cancel-admin-modal'),
        adminModalFeedback: document.getElementById('admin-modal-feedback'),

        // Admin Settings Modal
        adminSettingsModal: document.getElementById('admin-settings-modal'),
        adminSettingsForm: document.getElementById('admin-settings-form'),
        settingsAdminPin: document.getElementById('settings-admin-pin'),
        newHubInput: document.getElementById('new-hub-input'),
        btnAddHub: document.getElementById('btn-add-hub'),
        hubTagsContainer: document.getElementById('hub-tags-container'),
        btnCancelSettings: document.getElementById('btn-cancel-settings'),
        settingsModalFeedback: document.getElementById('settings-modal-feedback'),
        btnOpenSettings: document.getElementById('btn-open-settings'),

        // Admin Delivery Verification OTP Modal
        adminOtpModal: document.getElementById('admin-otp-modal'),
        adminOtpForm: document.getElementById('admin-otp-form'),
        adminDeliveryOtpInput: document.getElementById('admin-delivery-otp-input'),
        adminOtpHint: document.getElementById('admin-otp-hint'),
        adminOtpFeedback: document.getElementById('admin-otp-feedback'),
        btnCancelDeliverModal: document.getElementById('btn-cancel-deliver-modal'),
        btnConfirmDeliver: document.getElementById('btn-confirm-deliver'),

        // Printable Invoice Modal
        invoiceModal: document.getElementById('invoice-modal'),
        btnCloseInvoice: document.getElementById('btn-close-invoice'),
        btnCloseInvoiceX: document.getElementById('btn-close-invoice-x'),
        btnPrintInvoice: document.getElementById('btn-print-invoice'),
        invoiceOrderId: document.getElementById('invoice-order-id'),
        invoiceDate: document.getElementById('invoice-date'),
        invoiceCustomerName: document.getElementById('invoice-customer-name'),
        invoiceLocation: document.getElementById('invoice-location'),
        invoiceEstDelivery: document.getElementById('invoice-est-delivery'),
        invoiceStatusBadge: document.getElementById('invoice-status-badge'),
        invoiceLastUpdated: document.getElementById('invoice-last-updated'),
        invoiceItemName: document.getElementById('invoice-item-name'),
        invoiceItemQty: document.getElementById('invoice-item-qty'),
        invoiceItemPrice: document.getElementById('invoice-item-price'),
        invoiceItemTotal: document.getElementById('invoice-item-total'),
        invoiceSubtotal: document.getElementById('invoice-subtotal'),
        invoiceGrandTotal: document.getElementById('invoice-grand-total'),

        // Customer: Place Order
        orderForm: document.getElementById('order-form'),
        customerNameInput: document.getElementById('customer-name'),
        productNameInput: document.getElementById('product-name'),
        productPriceInput: document.getElementById('product-price'),
        productQuantityInput: document.getElementById('product-quantity'),
        orderLocationInput: document.getElementById('order-location'),
        btnSubmitOrder: document.getElementById('btn-submit-order'),
        orderFormFeedback: document.getElementById('order-form-feedback'),

        // Customer: Track Order
        trackForm: document.getElementById('track-form'),
        trackOrderIdInput: document.getElementById('track-order-id'),
        btnTrackSubmit: document.getElementById('btn-track-submit'),
        trackingResultContainer: document.getElementById('tracking-result-container'),
        trackingEmptyState: document.getElementById('tracking-empty-state'),
        trackingOrderDetails: document.getElementById('tracking-order-details'),
        trackDisplayId: document.getElementById('track-display-id'),
        trackDisplayEstDelivery: document.getElementById('track-display-est-delivery'),
        trackDisplayProduct: document.getElementById('track-display-product'),
        trackDisplayMeta: document.getElementById('track-display-meta'),
        trackDisplayStatus: document.getElementById('track-display-status'),
        btnViewInvoice: document.getElementById('btn-view-invoice'),
        btnCancelOrder: document.getElementById('btn-cancel-order'),
        visualStatusStepper: document.getElementById('visual-status-stepper'),
        trackingTimeline: document.getElementById('tracking-timeline'),

        // Dynamic QR Code & OTP Card
        trackingQrCode: document.getElementById('tracking-qrcode'),
        trackOtpCard: document.getElementById('track-otp-card'),
        trackDisplayOtp: document.getElementById('track-display-otp'),

        // Interactive Logistics Map
        trackingMap: document.getElementById('tracking-map'),

        // Post-Delivery Feedback & Review
        deliveryReviewContainer: document.getElementById('delivery-review-container'),
        orderReviewForm: document.getElementById('order-review-form'),
        starRatingList: document.getElementById('star-rating-list'),
        ratingLabelText: document.getElementById('rating-label-text'),
        reviewComment: document.getElementById('review-comment'),
        btnSubmitReview: document.getElementById('btn-submit-review'),
        submittedReviewDisplay: document.getElementById('submitted-review-display'),

        // Admin: Metrics, Filters & Controls
        btnExportCsv: document.getElementById('btn-export-csv'),
        btnRefreshAdmin: document.getElementById('btn-refresh-admin'),
        metricTotalOrders: document.getElementById('metric-total-orders'),
        metricPendingOrders: document.getElementById('metric-pending-orders'),
        metricShippedOrders: document.getElementById('metric-shipped-orders'),
        metricDeliveredOrders: document.getElementById('metric-delivered-orders'),
        adminSearchOrders: document.getElementById('admin-search-orders'),
        adminFilterStatus: document.getElementById('admin-filter-status'),
        adminOrdersTbody: document.getElementById('admin-orders-tbody'),

        // Notifications
        toastContainer: document.getElementById('toast-container')
    };

    // -------------------------------------------------------------------------
    // 3. UI Helper Utilities
    // -------------------------------------------------------------------------
    
    function showToast(message, type = 'info', duration = 3500) {
        if (!DOM.toastContainer) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
        DOM.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 250ms ease';
            setTimeout(() => toast.remove(), 250);
        }, duration);
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDateTime(isoString) {
        if (!isoString) return 'Just now';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return isoString;
        }
    }

    function formatDateOnly(isoString) {
        if (!isoString) return 'Estimated in 3 days';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return isoString;
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (e) {
            return isoString;
        }
    }

    function normalizeStatus(status) {
        if (!status) return "Order Placed";
        const key = status.trim().toLowerCase();
        return STATUS_NORMALIZATION_MAP[key] || status.trim();
    }

    function getStatusBadgeClass(status) {
        const norm = normalizeStatus(status).toLowerCase();
        if (norm.includes('placed')) return 'status-placed';
        if (norm.includes('confirmed') || norm.includes('packed') || norm.includes('processing')) return 'status-confirmed';
        if (norm.includes('shipped') || norm.includes('transit') || norm.includes('out for delivery')) return 'status-shipped';
        if (norm.includes('delivered')) return 'status-delivered';
        if (norm.includes('cancelled')) return 'status-cancelled';
        return 'status-placed';
    }

    // -------------------------------------------------------------------------
    // 4. Role & View Switching Logic
    // -------------------------------------------------------------------------

    function switchView(viewName) {
        currentRole = viewName;
        if (viewName === 'admin') {
            DOM.customerView.classList.add('hidden');
            DOM.customerView.classList.remove('active');
            DOM.adminView.classList.remove('hidden');
            DOM.adminView.classList.add('active');

            DOM.navBtnCustomer.classList.remove('active');
            DOM.navBtnAdmin.classList.add('hidden');
            DOM.navBtnLogout.classList.remove('hidden');
        } else {
            DOM.adminView.classList.add('hidden');
            DOM.adminView.classList.remove('active');
            DOM.customerView.classList.remove('hidden');
            DOM.customerView.classList.add('active');

            DOM.navBtnCustomer.classList.add('active');
            DOM.navBtnAdmin.classList.remove('hidden');
            DOM.navBtnLogout.classList.add('hidden');

            // If an active order was loaded, ensure map tiles refresh properly
            if (logisticsMap && currentActiveOrder) {
                setTimeout(() => logisticsMap.invalidateSize(), 150);
            }
        }
    }

    function openAdminModal() {
        if (DOM.adminModalFeedback) {
            DOM.adminModalFeedback.classList.add('hidden');
            DOM.adminModalFeedback.textContent = '';
        }
        if (DOM.adminPinInput) {
            DOM.adminPinInput.value = '';
        }
        DOM.adminModal.classList.remove('hidden');
        setTimeout(() => DOM.adminPinInput && DOM.adminPinInput.focus(), 50);
    }

    function closeAdminModal() {
        DOM.adminModal.classList.add('hidden');
        if (DOM.adminPinInput) DOM.adminPinInput.value = '';
        if (DOM.adminModalFeedback) DOM.adminModalFeedback.classList.add('hidden');
    }

    async function handleAdminLogin(e) {
        e.preventDefault();
        const enteredPin = DOM.adminPinInput ? DOM.adminPinInput.value.trim() : "";

        if (!enteredPin) {
            if (DOM.adminModalFeedback) {
                DOM.adminModalFeedback.textContent = "Please enter your administrative PIN.";
                DOM.adminModalFeedback.classList.remove('hidden');
            }
            return;
        }

        try {
            const res = await fetch('/api/admin/verify-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: enteredPin })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                closeAdminModal();
                switchView('admin');
                showToast("Welcome back, Administrator!", "success");
                fetchAdminData();
                fetchAdminSettings();
            } else {
                if (DOM.adminModalFeedback) {
                    DOM.adminModalFeedback.textContent = data.error || "Invalid Security PIN. Please try again.";
                    DOM.adminModalFeedback.classList.remove('hidden');
                    DOM.adminPinInput.select();
                }
            }
        } catch (err) {
            if (enteredPin === DEFAULT_ADMIN_PIN) {
                closeAdminModal();
                switchView('admin');
                showToast("Welcome back, Administrator!", "success");
                fetchAdminData();
            } else {
                if (DOM.adminModalFeedback) {
                    DOM.adminModalFeedback.textContent = "Invalid Security PIN. Please try again.";
                    DOM.adminModalFeedback.classList.remove('hidden');
                }
            }
        }
    }

    function handleAdminLogout() {
        switchView('customer');
        showToast("Logged out from admin console.", "info");
    }

    // -------------------------------------------------------------------------
    // 5. Customer Operations (Place Order, Track, Cancel & Receipt)
    // -------------------------------------------------------------------------

    async function handlePlaceOrder(e) {
        e.preventDefault();
        
        const customerName = DOM.customerNameInput.value.trim();
        const productName = DOM.productNameInput.value.trim();
        const price = parseFloat(DOM.productPriceInput.value);
        const quantity = parseInt(DOM.productQuantityInput.value, 10);
        const location = DOM.orderLocationInput.value.trim();

        if (!customerName || !productName || isNaN(price) || isNaN(quantity)) {
            showOrderFormFeedback("Please fill out all required fields properly.", "error");
            return;
        }

        DOM.btnSubmitOrder.disabled = true;
        DOM.btnSubmitOrder.innerHTML = `<span>Placing Order...</span>`;

        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: customerName,
                    product_name: productName,
                    price: price,
                    quantity: quantity,
                    location: location || "Warehouse - Central Hub"
                })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to create order");
            }

            const createdOrder = result.order;
            const newOrderId = createdOrder.order_id;

            showOrderFormFeedback(`🎉 Order Placed Successfully! Your Tracking ID is <strong>${newOrderId}</strong>.`, "success");
            showToast(`Order ${newOrderId} created successfully!`, "success");

            // Reset form
            DOM.orderForm.reset();
            DOM.productQuantityInput.value = 1;

            // Automatically autofill and track the newly created order
            DOM.trackOrderIdInput.value = newOrderId;
            trackOrder(newOrderId);

        } catch (error) {
            showOrderFormFeedback(`Error: ${error.message}`, "error");
            showToast(error.message, "error");
        } finally {
            DOM.btnSubmitOrder.disabled = false;
            DOM.btnSubmitOrder.innerHTML = `<span class="btn-text">Submit Order</span><span class="btn-icon">→</span>`;
        }
    }

    function showOrderFormFeedback(message, type) {
        if (!DOM.orderFormFeedback) return;
        DOM.orderFormFeedback.className = `feedback-box feedback-${type}`;
        DOM.orderFormFeedback.innerHTML = message;
        DOM.orderFormFeedback.classList.remove('hidden');
    }

    async function handleTrackSubmit(e) {
        if (e) e.preventDefault();
        const orderId = DOM.trackOrderIdInput.value.trim();
        if (!orderId) {
            showToast("Please enter a valid Order ID to track.", "error");
            return;
        }
        await trackOrder(orderId);
    }

    async function trackOrder(orderId) {
        DOM.btnTrackSubmit.disabled = true;
        DOM.btnTrackSubmit.innerHTML = `<span>...</span>`;

        try {
            const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/track`);
            const data = await response.json();

            if (response.status === 404 || !data.success || !data.order) {
                renderTrackingNotFound(orderId);
                return;
            }

            currentActiveOrder = data.order;
            renderTrackingDetails(data.order);
        } catch (error) {
            showToast(`Unable to fetch tracking: ${error.message}`, "error");
            renderTrackingNotFound(orderId, error.message);
        } finally {
            DOM.btnTrackSubmit.disabled = false;
            DOM.btnTrackSubmit.innerHTML = `<span>Track</span>`;
        }
    }

    function renderTrackingNotFound(orderId, customMsg) {
        currentActiveOrder = null;
        DOM.trackingEmptyState.classList.remove('hidden');
        DOM.trackingOrderDetails.classList.add('hidden');
        
        DOM.trackingEmptyState.innerHTML = `
            <div class="empty-icon">🔍</div>
            <h3 class="empty-title">Order Not Found</h3>
            <p class="empty-text">${customMsg || `No order matching ID <strong>${escapeHtml(orderId)}</strong> was found. Please verify the ID and try again.`}</p>
        `;
    }

    function renderTrackingDetails(order) {
        DOM.trackingEmptyState.classList.add('hidden');
        DOM.trackingOrderDetails.classList.remove('hidden');

        // 1. Order Summary
        DOM.trackDisplayId.textContent = order.order_id;
        DOM.trackDisplayProduct.textContent = order.product_name;
        DOM.trackDisplayMeta.textContent = `Customer: ${order.customer_name} • Qty: ${order.quantity} • Total: $${Number(order.total_amount || (order.price * order.quantity)).toFixed(2)}`;
        
        // Estimated Delivery Date
        if (DOM.trackDisplayEstDelivery) {
            const estFormatted = formatDateOnly(order.estimated_delivery);
            DOM.trackDisplayEstDelivery.textContent = `📅 Est. Delivery: ${estFormatted}`;
        }

        const currentStatus = order.current_status || "Order Placed";
        DOM.trackDisplayStatus.textContent = currentStatus;
        DOM.trackDisplayStatus.className = `status-badge ${getStatusBadgeClass(currentStatus)}`;

        // 2. Order Cancellation Button State
        if (DOM.btnCancelOrder) {
            const isCancellable = currentStatus.toLowerCase() === "order placed";
            if (isCancellable) {
                DOM.btnCancelOrder.disabled = false;
                DOM.btnCancelOrder.textContent = "❌ Cancel Order";
                DOM.btnCancelOrder.title = "Cancel this order before processing";
            } else if (currentStatus.toLowerCase() === "cancelled") {
                DOM.btnCancelOrder.disabled = true;
                DOM.btnCancelOrder.textContent = "❌ Cancelled";
                DOM.btnCancelOrder.title = "This order has been cancelled";
            } else {
                DOM.btnCancelOrder.disabled = true;
                DOM.btnCancelOrder.textContent = "❌ Cancel (In Fulfillment)";
                DOM.btnCancelOrder.title = "Order cannot be cancelled once processed or dispatched";
            }
        }

        // 3. Dynamic QR Code Generator (qrcode.js)
        renderDynamicQrCode(order.order_id);

        // 4. Secure 4-Digit Delivery Verification OTP Card
        if (DOM.trackDisplayOtp) {
            DOM.trackDisplayOtp.textContent = order.delivery_otp || "5829";
        }

        // 5. 6-Step Visual Stepper
        renderVisualStepper(currentStatus);

        // 6. Interactive Logistics Map (Leaflet.js)
        renderLogisticsMap(order);

        // 7. Post-Delivery Feedback & 5-Star Rating Card
        renderDeliveryReviewSection(order);

        // 8. Detailed Activity Timeline
        renderActivityTimeline(order.tracking_history || []);
    }

    async function handleCancelOrder() {
        if (!currentActiveOrder) return;
        const orderId = currentActiveOrder.order_id;

        const confirmCancel = confirm(`Are you sure you want to cancel Order ${orderId}?`);
        if (!confirmCancel) return;

        try {
            const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || "Cancellation failed");
            }

            showToast(`Order ${orderId} cancelled successfully.`, "success");
            await trackOrder(orderId);

            if (currentRole === 'admin') {
                fetchAdminData();
            }
        } catch (error) {
            showToast(error.message, "error");
        }
    }

    function renderVisualStepper(currentStatus) {
        const normalizedCurrent = normalizeStatus(currentStatus);
        const currentIndex = ORDER_STEPS.indexOf(normalizedCurrent);
        const isCancelled = normalizedCurrent.toLowerCase() === "cancelled";

        DOM.visualStatusStepper.innerHTML = '';

        ORDER_STEPS.forEach((stepName, idx) => {
            const stepItem = document.createElement('div');
            stepItem.className = 'step-item';
            stepItem.dataset.step = stepName;

            if (isCancelled) {
                if (idx === 0) {
                    stepItem.classList.add('completed');
                } else {
                    stepItem.classList.add('pending');
                }
            } else if (idx < currentIndex) {
                stepItem.classList.add('completed');
            } else if (idx === currentIndex) {
                stepItem.classList.add('active');
            } else {
                stepItem.classList.add('pending');
            }

            const stepDot = document.createElement('div');
            stepDot.className = 'step-dot';
            if (idx > currentIndex || isCancelled) {
                stepDot.textContent = `${idx + 1}`;
            }

            const stepLabel = document.createElement('span');
            stepLabel.className = 'step-label';
            stepLabel.textContent = stepName;

            stepItem.appendChild(stepDot);
            stepItem.appendChild(stepLabel);
            DOM.visualStatusStepper.appendChild(stepItem);

            if (idx < ORDER_STEPS.length - 1) {
                const stepLine = document.createElement('div');
                stepLine.className = 'step-line';
                if (!isCancelled) {
                    if (idx < currentIndex) {
                        stepLine.classList.add('completed');
                    } else if (idx === currentIndex) {
                        stepLine.classList.add('active');
                    }
                }
                DOM.visualStatusStepper.appendChild(stepLine);
            }
        });
    }

    function renderActivityTimeline(history) {
        DOM.trackingTimeline.innerHTML = '';

        if (!history || history.length === 0) {
            DOM.trackingTimeline.innerHTML = `<p class="text-muted" style="font-size: 0.85rem;">No historical events recorded yet.</p>`;
            return;
        }

        const sortedHistory = [...history].reverse();

        sortedHistory.forEach((event) => {
            const item = document.createElement('div');
            item.className = 'timeline-item';

            const marker = document.createElement('div');
            marker.className = 'timeline-marker';

            const status = document.createElement('div');
            status.className = 'timeline-status';
            status.textContent = event.status || 'Status Update';

            const location = document.createElement('div');
            location.className = 'timeline-location';
            location.textContent = `📍 ${event.location || 'Fulfillment Hub'}`;

            const time = document.createElement('div');
            time.className = 'timeline-time';
            time.textContent = `🕒 ${formatDateTime(event.timestamp)}`;

            item.appendChild(marker);
            item.appendChild(status);
            item.appendChild(location);
            item.appendChild(time);

            DOM.trackingTimeline.appendChild(item);
        });
    }

    // -------------------------------------------------------------------------
    // 6. Dynamic QR Code Generator Module (qrcode.js)
    // -------------------------------------------------------------------------

    function renderDynamicQrCode(orderId) {
        if (!DOM.trackingQrCode) return;
        DOM.trackingQrCode.innerHTML = '';

        const trackingUrl = `${window.location.origin}${window.location.pathname}?track=${encodeURIComponent(orderId)}`;

        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(DOM.trackingQrCode, {
                    text: trackingUrl,
                    width: 64,
                    height: 64,
                    colorDark: "#1F2937",
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.M
                });
            } catch (err) {
                console.warn("QR Code generation error:", err);
                DOM.trackingQrCode.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-muted);">QR Code</span>`;
            }
        } else {
            DOM.trackingQrCode.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-muted);">QR Code</span>`;
        }
    }

    // -------------------------------------------------------------------------
    // 7. Interactive Logistics Map Module (Leaflet.js + OpenStreetMap)
    // -------------------------------------------------------------------------

    function getHubLocationCoordinates(locationStr, index = 0) {
        if (!locationStr) {
            return { lat: 40.7128 + (index * 0.5), lng: -74.0060 - (index * 0.8), name: "Fulfillment Checkpoint" };
        }

        // Check exact match
        for (const [key, coords] of Object.entries(HUB_COORDINATES)) {
            if (locationStr.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(locationStr.toLowerCase())) {
                return coords;
            }
        }

        // Deterministic geographic offset for custom hubs to render cleanly within US routes
        let hash = 0;
        for (let i = 0; i < locationStr.length; i++) {
            hash = (hash << 5) - hash + locationStr.charCodeAt(i);
            hash |= 0;
        }
        const latOffset = ((Math.abs(hash) % 100) / 100) * 8 - 4; // +/- 4 deg
        const lngOffset = ((Math.abs(hash >> 3) % 100) / 100) * 15 - 7.5; // +/- 7.5 deg
        
        return {
            lat: 39.50 + latOffset,
            lng: -89.00 + lngOffset,
            name: locationStr
        };
    }

    function renderLogisticsMap(order) {
        if (!DOM.trackingMap || typeof L === 'undefined') return;

        // 1. Initialize Map if not created yet
        if (!logisticsMap) {
            logisticsMap = L.map(DOM.trackingMap, {
                center: [39.8283, -98.5795], // US Center
                zoom: 4,
                zoomControl: true,
                scrollWheelZoom: false
            });

            // OpenStreetMap Tile Layer - Zero API Key Needed
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 18
            }).addTo(logisticsMap);

            mapLayerGroup = L.layerGroup().addTo(logisticsMap);
        } else {
            mapLayerGroup.clearLayers();
        }

        // Force Leaflet to recalculate container size
        setTimeout(() => {
            if (logisticsMap) logisticsMap.invalidateSize();
        }, 100);

        const history = order.tracking_history || [];
        const routePoints = [];
        const latLngs = [];

        // 2. Extract Route Points from History
        history.forEach((event, idx) => {
            const locCoords = getHubLocationCoordinates(event.location, idx);
            routePoints.push({
                status: event.status,
                locationName: event.location || locCoords.name,
                timestamp: event.timestamp,
                lat: locCoords.lat,
                lng: locCoords.lng,
                isOrigin: idx === 0,
                isLatest: idx === history.length - 1
            });
            latLngs.push([locCoords.lat, locCoords.lng]);
        });

        // If only 1 point, add standard destination for route preview
        if (routePoints.length === 1 && order.current_status !== 'Delivered') {
            const destCoords = HUB_COORDINATES["Local Delivery Center"];
            routePoints.push({
                status: "Destination Facility",
                locationName: "Local Delivery & Fulfillment Center",
                timestamp: order.estimated_delivery,
                lat: destCoords.lat,
                lng: destCoords.lng,
                isOrigin: false,
                isLatest: false,
                isDestination: true
            });
            latLngs.push([destCoords.lat, destCoords.lng]);
        }

        // 3. Plot Route Markers
        routePoints.forEach((pt) => {
            let markerIconHtml = '🚚';
            let markerClass = 'map-marker-pin';

            if (pt.isOrigin) {
                markerIconHtml = '🏭';
            } else if (pt.isDestination || pt.status === 'Delivered') {
                markerIconHtml = '🏠';
            } else if (pt.isLatest) {
                markerIconHtml = '📍';
                markerClass += ' map-marker-current';
            }

            const customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: `<div class="${markerClass}">${markerIconHtml}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -18]
            });

            const marker = L.marker([pt.lat, pt.lng], { icon: customIcon });

            const popupContent = `
                <div style="font-family: var(--font-primary); font-size: 0.82rem;">
                    <div style="font-weight: 800; color: var(--accent-amber-dark); margin-bottom: 2px;">
                        ${escapeHtml(pt.status)}
                    </div>
                    <div style="color: var(--text-primary); font-weight: 600;">
                        📍 ${escapeHtml(pt.locationName)}
                    </div>
                    <div style="color: var(--text-muted); font-size: 0.74rem; margin-top: 2px;">
                        🕒 ${formatDateTime(pt.timestamp)}
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);
            mapLayerGroup.addLayer(marker);

            if (pt.isLatest) {
                marker.openPopup();
            }
        });

        // 4. Draw Route Polyline
        if (latLngs.length > 1) {
            const routeLine = L.polyline(latLngs, {
                color: '#F59E0B',
                weight: 4,
                opacity: 0.85,
                dashArray: '8, 8',
                lineJoin: 'round'
            });
            mapLayerGroup.addLayer(routeLine);

            const bounds = L.latLngBounds(latLngs);
            logisticsMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
        } else if (latLngs.length === 1) {
            logisticsMap.setView(latLngs[0], 8);
        }
    }

    // -------------------------------------------------------------------------
    // 8. Post-Delivery 5-Star Rating & Feedback Module
    // -------------------------------------------------------------------------

    function renderDeliveryReviewSection(order) {
        if (!DOM.deliveryReviewContainer) return;

        const isDelivered = (order.current_status || "").toLowerCase() === "delivered";

        if (!isDelivered) {
            DOM.deliveryReviewContainer.classList.add('hidden');
            return;
        }

        DOM.deliveryReviewContainer.classList.remove('hidden');

        // Check if customer already submitted a review
        if (order.review && order.review.rating) {
            DOM.orderReviewForm.classList.add('hidden');
            DOM.submittedReviewDisplay.classList.remove('hidden');

            const starsHtml = '★'.repeat(order.review.rating) + '☆'.repeat(5 - order.review.rating);
            DOM.submittedReviewDisplay.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="review-stars-static">${starsHtml}</span>
                    <span class="review-date">Submitted on ${formatDateTime(order.review.submitted_at)}</span>
                </div>
                ${order.review.comment ? `<p class="review-comment-text">"${escapeHtml(order.review.comment)}"</p>` : ''}
                <div style="font-size: 0.76rem; color: #065F46; font-weight: 700; margin-top: 0.2rem;">
                    ✓ Verified Customer Review Recorded
                </div>
            `;
        } else {
            DOM.orderReviewForm.classList.remove('hidden');
            DOM.submittedReviewDisplay.classList.add('hidden');
            DOM.reviewComment.value = '';
            setStarRating(5);
        }
    }

    function setStarRating(rating) {
        selectedRating = rating;
        if (!DOM.starRatingList) return;

        const stars = DOM.starRatingList.querySelectorAll('.star-btn');
        stars.forEach((star) => {
            const starVal = parseInt(star.getAttribute('data-rating'), 10);
            if (starVal <= rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
            star.classList.remove('hovered');
        });

        if (DOM.ratingLabelText) {
            DOM.ratingLabelText.textContent = RATING_LABELS[rating] || `${rating} Stars`;
        }
    }

    function previewStarRating(rating) {
        if (!DOM.starRatingList) return;
        const stars = DOM.starRatingList.querySelectorAll('.star-btn');
        stars.forEach((star) => {
            const starVal = parseInt(star.getAttribute('data-rating'), 10);
            if (starVal <= rating) {
                star.classList.add('hovered');
            } else {
                star.classList.remove('hovered');
            }
        });

        if (DOM.ratingLabelText) {
            DOM.ratingLabelText.textContent = RATING_LABELS[rating] || `${rating} Stars`;
        }
    }

    async function handleReviewSubmit(e) {
        e.preventDefault();
        if (!currentActiveOrder) return;

        const orderId = currentActiveOrder.order_id;
        const comment = DOM.reviewComment.value.trim();

        DOM.btnSubmitReview.disabled = true;
        DOM.btnSubmitReview.innerHTML = `<span>Submitting...</span>`;

        try {
            const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: selectedRating,
                    comment: comment
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to submit review");
            }

            showToast("Thank you for your rating & feedback!", "success");

            // Update active order state
            currentActiveOrder.review = data.review;
            renderDeliveryReviewSection(currentActiveOrder);

        } catch (err) {
            showToast(err.message, "error");
        } finally {
            DOM.btnSubmitReview.disabled = false;
            DOM.btnSubmitReview.innerHTML = `<span>Submit Review</span>`;
        }
    }

    // -------------------------------------------------------------------------
    // 9. Admin Operations & OTP Delivery Verification Handlers
    // -------------------------------------------------------------------------

    async function fetchAdminData() {
        try {
            const [metricsRes, ordersRes] = await Promise.all([
                fetch('/api/admin/metrics'),
                fetch('/api/admin/orders')
            ]);

            const metricsData = await metricsRes.json();
            const ordersData = await ordersRes.json();

            if (metricsData.success) {
                updateAdminMetrics(metricsData);
            }

            if (ordersData.success) {
                allAdminOrders = ordersData.orders || [];
                renderAdminOrdersTable(allAdminOrders);
            }
        } catch (error) {
            showToast(`Error syncing admin data: ${error.message}`, "error");
        }
    }

    function updateAdminMetrics(metricsData) {
        const total = metricsData.total_orders || 0;
        const breakdown = metricsData.status_breakdown || {};

        let pendingCount = 0;
        let shippedCount = 0;
        let deliveredCount = 0;

        Object.keys(breakdown).forEach(statusKey => {
            const count = breakdown[statusKey] || 0;
            const norm = normalizeStatus(statusKey).toLowerCase();

            if (norm.includes('placed') || norm.includes('confirmed') || norm.includes('packed') || norm.includes('processing')) {
                pendingCount += count;
            } else if (norm.includes('shipped') || norm.includes('transit') || norm.includes('out for delivery')) {
                shippedCount += count;
            } else if (norm.includes('delivered')) {
                deliveredCount += count;
            }
        });

        if (DOM.metricTotalOrders) DOM.metricTotalOrders.textContent = total;
        if (DOM.metricPendingOrders) DOM.metricPendingOrders.textContent = pendingCount;
        if (DOM.metricShippedOrders) DOM.metricShippedOrders.textContent = shippedCount;
        if (DOM.metricDeliveredOrders) DOM.metricDeliveredOrders.textContent = deliveredCount;
    }

    function renderAdminOrdersTable(orders) {
        if (!DOM.adminOrdersTbody) return;
        DOM.adminOrdersTbody.innerHTML = '';

        const filterQuery = DOM.adminSearchOrders ? DOM.adminSearchOrders.value.trim().toLowerCase() : '';
        const statusFilter = DOM.adminFilterStatus ? DOM.adminFilterStatus.value.trim().toLowerCase() : 'all';

        const filteredOrders = orders.filter(o => {
            const matchesSearch = !filterQuery || (
                (o.order_id && o.order_id.toLowerCase().includes(filterQuery)) ||
                (o.customer_name && o.customer_name.toLowerCase().includes(filterQuery)) ||
                (o.product_name && o.product_name.toLowerCase().includes(filterQuery)) ||
                (o.current_status && o.current_status.toLowerCase().includes(filterQuery))
            );

            const matchesStatus = statusFilter === 'all' || (o.current_status && o.current_status.toLowerCase() === statusFilter);

            return matchesSearch && matchesStatus;
        });

        if (filteredOrders.length === 0) {
            DOM.adminOrdersTbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                        No matching orders found.
                    </td>
                </tr>
            `;
            return;
        }

        filteredOrders.forEach(order => {
            const tr = document.createElement('tr');

            const currentStatus = order.current_status || "Order Placed";
            const badgeClass = getStatusBadgeClass(currentStatus);
            const totalFormatted = `$${Number(order.total_amount || (order.price * order.quantity)).toFixed(2)}`;
            const lastLocation = (order.tracking_history && order.tracking_history.length > 0)
                ? order.tracking_history[order.tracking_history.length - 1].location
                : "Central Hub";

            tr.innerHTML = `
                <td>
                    <span class="table-order-id">${escapeHtml(order.order_id)}</span>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">${formatDateTime(order.created_at)}</div>
                </td>
                <td>
                    <strong>${escapeHtml(order.customer_name)}</strong>
                    <div style="font-size: 0.72rem; color: #92400E;">OTP: <strong>${escapeHtml(order.delivery_otp || '5829')}</strong></div>
                </td>
                <td>
                    ${escapeHtml(order.product_name)} 
                    <span style="color: var(--text-muted); font-size: 0.8rem;">(×${order.quantity})</span>
                </td>
                <td>
                    <strong>${totalFormatted}</strong>
                </td>
                <td>
                    <span class="status-badge ${badgeClass}">${escapeHtml(currentStatus)}</span>
                </td>
                <td>
                    <select class="hub-select" id="select-hub-${order.order_id}" aria-label="Checkpoint hub for ${order.order_id}">
                        ${deliveryHubs.map(hub => `
                            <option value="${hub}" ${hub === lastLocation ? 'selected' : ''}>${hub}</option>
                        `).join('')}
                    </select>
                </td>
                <td>
                    <div class="action-form">
                        <select class="status-select" id="select-status-${order.order_id}" aria-label="Select new status for ${order.order_id}">
                            ${ORDER_STEPS.map(step => `
                                <option value="${step}" ${step === currentStatus ? 'selected' : ''}>${step}</option>
                            `).join('')}
                            <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button type="button" class="btn btn-sm btn-accent btn-update-status" data-order-id="${order.order_id}">
                            Update
                        </button>
                    </div>
                </td>
            `;

            DOM.adminOrdersTbody.appendChild(tr);
        });

        // Bind update buttons
        DOM.adminOrdersTbody.querySelectorAll('.btn-update-status').forEach(btn => {
            btn.addEventListener('click', () => {
                const orderId = btn.getAttribute('data-order-id');
                const selectElement = document.getElementById(`select-status-${orderId}`);
                const hubElement = document.getElementById(`select-hub-${orderId}`);
                if (selectElement) {
                    const newStatus = selectElement.value;
                    const hubLocation = hubElement ? hubElement.value : "Transit Checkpoint";

                    // 4-Digit OTP Gate for 'Delivered'
                    if (newStatus.toLowerCase() === "delivered") {
                        openAdminOtpModal(orderId, newStatus, hubLocation);
                    } else {
                        executeOrderStatusUpdate(orderId, newStatus, hubLocation);
                    }
                }
            });
        });
    }

    function openAdminOtpModal(orderId, newStatus, hubLocation) {
        pendingDeliveryOrder = { orderId, newStatus, hubLocation };
        if (DOM.adminOtpFeedback) {
            DOM.adminOtpFeedback.classList.add('hidden');
            DOM.adminOtpFeedback.textContent = '';
        }
        if (DOM.adminDeliveryOtpInput) {
            DOM.adminDeliveryOtpInput.value = '';
        }
        if (DOM.adminOtpHint) {
            DOM.adminOtpHint.textContent = `Ask customer for the 4-digit PIN for order ${orderId}.`;
        }
        DOM.adminOtpModal.classList.remove('hidden');
        setTimeout(() => DOM.adminDeliveryOtpInput && DOM.adminDeliveryOtpInput.focus(), 50);
    }

    function closeAdminOtpModal() {
        DOM.adminOtpModal.classList.add('hidden');
        pendingDeliveryOrder = null;
        if (DOM.adminDeliveryOtpInput) DOM.adminDeliveryOtpInput.value = '';
    }

    async function handleConfirmDeliveryOtp(e) {
        e.preventDefault();
        if (!pendingDeliveryOrder) return;

        const otpVal = DOM.adminDeliveryOtpInput.value.trim();
        if (!otpVal || otpVal.length < 4) {
            if (DOM.adminOtpFeedback) {
                DOM.adminOtpFeedback.textContent = "Please enter the full 4-digit verification PIN.";
                DOM.adminOtpFeedback.classList.remove('hidden');
            }
            return;
        }

        const { orderId, newStatus, hubLocation } = pendingDeliveryOrder;
        await executeOrderStatusUpdate(orderId, newStatus, hubLocation, otpVal);
    }

    async function executeOrderStatusUpdate(orderId, newStatus, hubLocation, otp = null) {
        try {
            const locationNote = hubLocation ? `${hubLocation} (${newStatus})` : `Checkpoint: ${newStatus}`;
            const payload = {
                status: newStatus,
                location: locationNote
            };
            if (otp) {
                payload.delivery_otp = otp;
            }

            const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to update order status");
            }

            if (newStatus.toLowerCase() === "delivered") {
                closeAdminOtpModal();
            }

            showToast(`Order ${orderId} status updated to '${newStatus}'!`, "success");
            
            // Refresh table and metrics
            await fetchAdminData();

            // Live sync customer tracking view if active
            if (DOM.trackDisplayId && DOM.trackDisplayId.textContent === orderId) {
                trackOrder(orderId);
            }
        } catch (error) {
            if (newStatus.toLowerCase() === "delivered" && DOM.adminOtpFeedback && !DOM.adminOtpModal.classList.contains('hidden')) {
                DOM.adminOtpFeedback.textContent = error.message;
                DOM.adminOtpFeedback.classList.remove('hidden');
            } else {
                showToast(`Update failed: ${error.message}`, "error");
            }
        }
    }

    function handleExportCsv() {
        showToast("Downloading order logs CSV...", "info", 2000);
        window.location.href = '/api/admin/export';
    }

    // -------------------------------------------------------------------------
    // 10. Printable Order Invoice Modal Handlers
    // -------------------------------------------------------------------------

    function openInvoiceModal() {
        if (!currentActiveOrder) {
            showToast("Please search and select an order first.", "error");
            return;
        }

        const o = currentActiveOrder;
        const total = Number(o.total_amount || (o.price * o.quantity)).toFixed(2);
        const unitPrice = Number(o.price || 0).toFixed(2);
        const firstLocation = (o.tracking_history && o.tracking_history[0] && o.tracking_history[0].location) || "Central Fulfillment Hub";

        DOM.invoiceOrderId.textContent = o.order_id;
        DOM.invoiceDate.textContent = `Date: ${formatDateTime(o.created_at)}`;
        DOM.invoiceCustomerName.textContent = o.customer_name;
        DOM.invoiceLocation.textContent = `Destination: ${firstLocation}`;
        DOM.invoiceEstDelivery.textContent = `Est. Delivery: ${formatDateOnly(o.estimated_delivery)}`;
        
        DOM.invoiceStatusBadge.textContent = o.current_status;
        DOM.invoiceStatusBadge.className = `status-badge ${getStatusBadgeClass(o.current_status)}`;
        DOM.invoiceLastUpdated.textContent = `Last Milestone: ${formatDateTime(o.updated_at)}`;

        DOM.invoiceItemName.textContent = o.product_name;
        DOM.invoiceItemQty.textContent = o.quantity;
        DOM.invoiceItemPrice.textContent = `$${unitPrice}`;
        DOM.invoiceItemTotal.textContent = `$${total}`;
        DOM.invoiceSubtotal.textContent = `$${total}`;
        DOM.invoiceGrandTotal.textContent = `$${total}`;

        DOM.invoiceModal.classList.remove('hidden');
    }

    function closeInvoiceModal() {
        DOM.invoiceModal.classList.add('hidden');
    }

    // -------------------------------------------------------------------------
    // 11. Admin Settings & Hub Configuration Handlers
    // -------------------------------------------------------------------------

    async function fetchAdminSettings() {
        try {
            const res = await fetch('/api/admin/settings');
            const data = await res.json();
            if (data.success && data.settings) {
                if (data.settings.delivery_hubs && data.settings.delivery_hubs.length > 0) {
                    deliveryHubs = data.settings.delivery_hubs;
                    localHubsList = [...deliveryHubs];
                }
                if (DOM.settingsAdminPin) {
                    DOM.settingsAdminPin.value = data.settings.admin_pin || DEFAULT_ADMIN_PIN;
                }
            }
        } catch (e) {
            console.warn("Could not load settings:", e);
        }
    }

    function openSettingsModal() {
        if (DOM.settingsModalFeedback) {
            DOM.settingsModalFeedback.classList.add('hidden');
        }
        localHubsList = [...deliveryHubs];
        renderHubPills();
        DOM.adminSettingsModal.classList.remove('hidden');
    }

    function closeSettingsModal() {
        DOM.adminSettingsModal.classList.add('hidden');
    }

    function renderHubPills() {
        if (!DOM.hubTagsContainer) return;
        DOM.hubTagsContainer.innerHTML = '';

        localHubsList.forEach((hubName, idx) => {
            const pill = document.createElement('span');
            pill.className = 'hub-tag';
            pill.innerHTML = `
                <span>${escapeHtml(hubName)}</span>
                <span class="hub-tag-remove" data-index="${idx}">&times;</span>
            `;
            DOM.hubTagsContainer.appendChild(pill);
        });

        DOM.hubTagsContainer.querySelectorAll('.hub-tag-remove').forEach(rmBtn => {
            rmBtn.addEventListener('click', () => {
                const idx = parseInt(rmBtn.getAttribute('data-index'), 10);
                localHubsList.splice(idx, 1);
                renderHubPills();
            });
        });
    }

    function handleAddHub() {
        const val = DOM.newHubInput.value.trim();
        if (!val) return;
        if (!localHubsList.includes(val)) {
            localHubsList.push(val);
            renderHubPills();
            DOM.newHubInput.value = '';
        } else {
            showToast("Hub already exists in the list.", "info");
        }
    }

    async function handleSaveSettings(e) {
        e.preventDefault();
        const newPin = DOM.settingsAdminPin.value.trim();
        if (!newPin) {
            showSettingsFeedback("Admin PIN cannot be empty.", "error");
            return;
        }

        try {
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_pin: newPin,
                    delivery_hubs: localHubsList
                })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to update settings");
            }

            deliveryHubs = [...localHubsList];
            showToast("System settings updated successfully!", "success");
            closeSettingsModal();
            renderAdminOrdersTable(allAdminOrders);
        } catch (err) {
            showSettingsFeedback(err.message, "error");
        }
    }

    function showSettingsFeedback(msg, type) {
        if (!DOM.settingsModalFeedback) return;
        DOM.settingsModalFeedback.className = `feedback-box feedback-${type}`;
        DOM.settingsModalFeedback.textContent = msg;
        DOM.settingsModalFeedback.classList.remove('hidden');
    }

    // -------------------------------------------------------------------------
    // 12. Event Listeners & Bootstrapping
    // -------------------------------------------------------------------------
    function initEventListeners() {
        // Top Navigation
        if (DOM.navBtnCustomer) {
            DOM.navBtnCustomer.addEventListener('click', () => switchView('customer'));
        }
        if (DOM.navBtnAdmin) {
            DOM.navBtnAdmin.addEventListener('click', openAdminModal);
        }
        if (DOM.navBtnLogout) {
            DOM.navBtnLogout.addEventListener('click', handleAdminLogout);
        }

        // Modal: Admin Auth
        if (DOM.btnCancelAdminModal) {
            DOM.btnCancelAdminModal.addEventListener('click', closeAdminModal);
        }
        if (DOM.adminLoginForm) {
            DOM.adminLoginForm.addEventListener('submit', handleAdminLogin);
        }

        // Modal: Delivery OTP Verification
        if (DOM.btnCancelDeliverModal) {
            DOM.btnCancelDeliverModal.addEventListener('click', closeAdminOtpModal);
        }
        if (DOM.adminOtpForm) {
            DOM.adminOtpForm.addEventListener('submit', handleConfirmDeliveryOtp);
        }

        // Modal: Admin Settings
        if (DOM.btnOpenSettings) {
            DOM.btnOpenSettings.addEventListener('click', openSettingsModal);
        }
        if (DOM.btnCancelSettings) {
            DOM.btnCancelSettings.addEventListener('click', closeSettingsModal);
        }
        if (DOM.btnAddHub) {
            DOM.btnAddHub.addEventListener('click', handleAddHub);
        }
        if (DOM.newHubInput) {
            DOM.newHubInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddHub();
                }
            });
        }
        if (DOM.adminSettingsForm) {
            DOM.adminSettingsForm.addEventListener('submit', handleSaveSettings);
        }

        // Modal: Printable Invoice
        if (DOM.btnViewInvoice) {
            DOM.btnViewInvoice.addEventListener('click', openInvoiceModal);
        }
        if (DOM.btnCloseInvoice) {
            DOM.btnCloseInvoice.addEventListener('click', closeInvoiceModal);
        }
        if (DOM.btnCloseInvoiceX) {
            DOM.btnCloseInvoiceX.addEventListener('click', closeInvoiceModal);
        }
        if (DOM.btnPrintInvoice) {
            DOM.btnPrintInvoice.addEventListener('click', () => window.print());
        }

        // Star Rating Controls
        if (DOM.starRatingList) {
            const stars = DOM.starRatingList.querySelectorAll('.star-btn');
            stars.forEach(star => {
                star.addEventListener('mouseenter', () => {
                    const rating = parseInt(star.getAttribute('data-rating'), 10);
                    previewStarRating(rating);
                });
                star.addEventListener('click', () => {
                    const rating = parseInt(star.getAttribute('data-rating'), 10);
                    setStarRating(rating);
                });
            });

            DOM.starRatingList.addEventListener('mouseleave', () => {
                setStarRating(selectedRating);
            });
        }

        // Review Form Submission
        if (DOM.orderReviewForm) {
            DOM.orderReviewForm.addEventListener('submit', handleReviewSubmit);
        }

        // Close on Backdrop or Escape key
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.add('hidden');
                }
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
            }
        });

        // Customer Forms & Buttons
        if (DOM.orderForm) {
            DOM.orderForm.addEventListener('submit', handlePlaceOrder);
        }
        if (DOM.trackForm) {
            DOM.trackForm.addEventListener('submit', handleTrackSubmit);
        }
        if (DOM.btnCancelOrder) {
            DOM.btnCancelOrder.addEventListener('click', handleCancelOrder);
        }

        // Admin Dashboard Controls
        if (DOM.btnRefreshAdmin) {
            DOM.btnRefreshAdmin.addEventListener('click', () => {
                showToast("Refreshing operational data...", "info", 1500);
                fetchAdminData();
            });
        }
        if (DOM.btnExportCsv) {
            DOM.btnExportCsv.addEventListener('click', handleExportCsv);
        }
        if (DOM.adminSearchOrders) {
            DOM.adminSearchOrders.addEventListener('input', () => {
                renderAdminOrdersTable(allAdminOrders);
            });
        }
        if (DOM.adminFilterStatus) {
            DOM.adminFilterStatus.addEventListener('change', () => {
                renderAdminOrdersTable(allAdminOrders);
            });
        }

        // Auto-check URL query parameters for ?track=ORD...
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const trackId = urlParams.get('track');
            if (trackId && DOM.trackOrderIdInput) {
                DOM.trackOrderIdInput.value = trackId;
                trackOrder(trackId);
            }
        } catch (e) {
            console.warn("Could not read URL params:", e);
        }
    }

    // Initialize application when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initEventListeners();
            fetchAdminSettings();
        });
    } else {
        initEventListeners();
        fetchAdminSettings();
    }

})();

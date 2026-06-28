---
title: "TOP-R Water Architecture Map"
generated_at: "2026-06-28"
last_mapped_commit: "b290a5285ea543504ec75d0f97373c40c5b143ea"
focus: "arch"
---

# Architecture

## System Shape

The project is a three-part mobile business system:

1. `client/` is the customer-facing Expo app.
2. `admin/` is the admin and delivery-boy Expo app.
3. `server/` is the Express API that owns business rules and Supabase access.

Supabase stores persistent data. Railway hosts the API. Razorpay handles payments. Expo Push API delivers customer notifications.

## Customer App Flow

`client/App.js` creates a stack navigator around `client/src/navigation/Tabs.js`. The tab navigator exposes Home, Products, Subscriptions, Cart, and Profile.

Customer app state is intentionally simple:

- Cart state lives in `client/src/context/CartContext.js`.
- Session and selected address live through AsyncStorage helpers in `client/src/services/session.js`.
- Network calls go through `client/src/services/api.js`.
- Push setup happens in `client/App.js` after session load.

Major customer flows:

- Product order: `ProductsScreen` or `HomeScreen` adds products to cart, `CartScreen` creates Razorpay order, verifies payment, then posts `/orders`.
- Subscription start: `SubscriptionsScreen` adds subscription item to cart, `CartScreen` creates subscription and a `type: "subscription"` order.
- Refill: `SubscriptionsScreen` creates refill cart item, `CartScreen` posts `type: "refill"` order.
- Return/cancellation: `SubscriptionsScreen` and `ReturnEmptyJarScreen` create return request orders.
- Tracking: `OrderTrackingScreen` polls latest/order-specific data and shows status timeline and delivery-boy details.

## Admin App Flow

`admin/App.js` gates admin tabs behind a simple stored admin session. It also exposes delivery-boy login before and after admin login.

Main admin tabs:

- Dashboard: `admin/src/screens/DashboardScreen.js`
- Orders: `admin/src/screens/OrdersScreen.js`
- Subscriptions: `admin/src/screens/SubscriptionsScreen.js`
- Inventory: `admin/src/screens/InventoryScreen.js`
- Customers: `admin/src/screens/CustomersScreen.js`

Stack detail screens include order detail, subscription detail, customer detail, return requests, analytics, delivery boys, delivery login/dashboard, and dev tools.

## Backend Route Architecture

`server/src/index.js` mounts route modules by domain:

- `/auth` -> `server/src/routes/auth.js`
- `/products` -> `server/src/routes/products.js`
- `/orders` -> `server/src/routes/orders.js`
- `/subscriptions` -> `server/src/routes/subscriptions.js`
- `/inventory` -> `server/src/routes/inventory.js`
- `/payments` -> `server/src/routes/payments.js`
- `/addresses` -> `server/src/routes/addresses.js`
- `/users` -> `server/src/routes/users.js`
- `/admin` -> `server/src/routes/admin.js`
- `/delivery` -> `server/src/routes/delivery.js`

The backend is the source of truth for status transitions, subscription validation, refill limits, return/refund staging, payment verification, delivery assignment, and dev seed/cleanup.

## Status Machines

Order status rules live in `server/src/utils/orderStatuses.js`.

Normal, refill, and subscription orders use:

`Placed -> Confirmed -> Assigned -> Picked Up -> Delivered`

Cancellation is allowed before pickup through the transition map.

Return orders use:

`Placed -> Confirmed -> Assigned -> Picked Up -> Returned -> Refund Completed -> Cancelled`

This state machine is enforced in backend order/admin/delivery routes and mirrored in admin/customer UI affordances.

## Data Flow

The dominant data flow is:

`Expo app -> API service wrapper -> Express route -> Supabase -> Express response -> screen state`

Admin routes also use `x-admin-key`. Customer routes rely primarily on user id from stored session. The test-mode customer session uses a fixed UUID for local/demo flows.

## Caching And Performance

Recent backend performance utilities:

- `server/src/utils/cache.js`
- `server/src/utils/pagination.js`

`GET /products` and `GET /inventory` use short TTL caching. Large list endpoints support optional pagination without changing old response shapes.

## Deployment Boundaries

The mobile apps are built with EAS into Android APKs. They use the deployed Railway backend URL in their API clients. The server uses environment variables for Supabase, Razorpay, admin dev tools, and port binding.

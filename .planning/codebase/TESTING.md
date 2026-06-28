---
title: "TOP-R Water Testing Map"
generated_at: "2026-06-28"
last_mapped_commit: "b290a5285ea543504ec75d0f97373c40c5b143ea"
focus: "quality"
---

# Testing

## Current Automated Test State

No dedicated unit test framework or test files are currently visible in `client/`, `admin/`, or `server/`. Validation has been handled mostly through manual smoke tests, Expo Doctor, syntax checks, API curls, Supabase migrations, and EAS build checks.

## Existing Validation Commands

Useful current commands:

- Server syntax: `cd server && node --check src/index.js && find src -name '*.js' -print0 | xargs -0 -n1 node --check`
- Customer health: `cd client && npx expo-doctor`
- Admin health: `cd admin && npx expo-doctor`
- Supabase migrations: `supabase db push --linked`
- Server local run: `cd server && node src/index.js`
- Customer Metro: `cd client && npx expo start --clear`
- Admin Metro: `cd admin && npx expo start --clear`

## Smoke Test Endpoints

Core backend smoke endpoints:

- `GET /health`
- `GET /products`
- `GET /inventory`
- `GET /orders/:userId`
- `GET /admin/dashboard-summary` with `x-admin-key`
- `GET /admin/analytics` with `x-admin-key`

Route implementations live in `server/src/routes/`.

## Customer MVP Test Flows

Important manual customer flows:

- Continue as guest/test user in `client/src/screens/AuthScreen.js`
- Add product from `client/src/screens/ProductsScreen.js`
- Checkout with Razorpay from `client/src/screens/CartScreen.js`
- View order in `client/src/screens/AllOrdersScreen.js`
- Track order in `client/src/screens/OrderTrackingScreen.js`
- Start 20L subscription in `client/src/screens/SubscriptionsScreen.js`
- Request refill from active subscription
- Request return/cancellation from subscription or `client/src/screens/ReturnEmptyJarScreen.js`
- Manage addresses in `client/src/screens/AddressBookScreen.js`
- View payments in `client/src/screens/PaymentScreen.js` and `TransactionHistoryScreen.js`

## Admin MVP Test Flows

Important manual admin flows:

- Login through `admin/src/screens/LoginScreen.js`
- Review dashboard in `admin/src/screens/DashboardScreen.js`
- Filter/search/sort orders in `admin/src/screens/OrdersScreen.js`
- Confirm/assign/update order in `admin/src/screens/OrderDetailScreen.js`
- Manage delivery boys in `admin/src/screens/DeliveryBoysScreen.js`
- Login delivery boy in `admin/src/screens/DeliveryLoginScreen.js`
- Update assigned delivery status in `admin/src/screens/DeliveryDashboardScreen.js`
- Manage inventory in `admin/src/screens/InventoryScreen.js`
- Review customers and detail pages in `admin/src/screens/CustomersScreen.js` and `CustomerDetailScreen.js`
- Process returns in `admin/src/screens/ReturnRequestsScreen.js` and `SubscriptionDetailScreen.js`
- Use demo cleanup/seed in `admin/src/screens/DevToolsScreen.js` when dev tools are enabled

## Recommended Test Additions

Near-term test coverage should focus on backend business logic first:

- Status transition unit tests for `server/src/utils/orderStatuses.js`
- Refill validation tests for `server/src/routes/orders.js`
- Return/refund state-machine tests for `server/src/routes/admin.js` and `server/src/routes/delivery.js`
- Address default/delete behavior tests for `server/src/routes/addresses.js`
- Payment verification error-path tests for `server/src/routes/payments.js`
- Admin analytics/dashboard summary contract tests for `server/src/routes/admin.js`

## APK Readiness Checks

Before final APKs:

- Customer `npx expo-doctor` passes
- Admin `npx expo-doctor` passes
- No localhost or LAN IP API URLs in tracked build config
- Customer package is `com.topr.water`
- Admin package is `com.topr.water.admin`
- Native modules such as Razorpay and notifications are tested in development/preview builds, not Expo Go

## Gaps

There is no CI workflow in `.github/workflows/`. There is no automated regression suite for payment/order/subscription/return workflows. Production readiness would benefit from a repeatable test harness around the clean-demo-state flows already used manually.

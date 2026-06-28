---
title: "TOP-R Water Concerns Map"
generated_at: "2026-06-28"
last_mapped_commit: "b290a5285ea543504ec75d0f97373c40c5b143ea"
focus: "concerns"
---

# Concerns

## Production Security

Admin authentication is currently MVP-grade. `admin/src/services/api.js` sends a hardcoded `x-admin-key`, and `server/src/middleware/admin.js` checks it. This should be replaced or strengthened before wider production use.

Customer routes generally trust `user_id` from the client session. For production, this should be tied to verified Supabase Auth sessions or a server-side authorization layer.

## Razorpay Public Key

`client/src/screens/CartScreen.js` currently has the Razorpay test public key inline in checkout options. A public key can be client-visible, but final production readiness needs a config-driven public key and test/prod separation.

## Debug Logging

MVP debug logs remain in sensitive flows:

- `client/src/screens/CartScreen.js` logs Razorpay/order payloads.
- `server/src/routes/orders.js` logs full order request and saved order.
- `server/src/services/notifications.js` logs notification events.

These logs help QA but should be reviewed before production, especially for personally identifiable information.

## Automated Tests Missing

There are no visible automated tests. The most important regression risks are order status transitions, payment verification, return/refund staging, refill quantity validation, address selection, inventory updates, and dashboard analytics counts.

## Native Build Risk

The customer app uses native modules:

- `react-native-razorpay`
- `expo-notifications`
- `expo-device`
- `expo-location`
- `@react-native-community/datetimepicker`

These require development/preview APK testing. Expo Go is not enough for full checkout/notification validation.

## Return/Refund Complexity

The return flow is intentionally staged and spans:

- Customer request in `client/src/screens/SubscriptionsScreen.js` or `ReturnEmptyJarScreen.js`
- Return order lifecycle in `server/src/routes/orders.js`
- Admin processing in `server/src/routes/admin.js`
- Delivery-boy updates in `server/src/routes/delivery.js`
- Admin UI in `admin/src/screens/ReturnRequestsScreen.js` and `SubscriptionDetailScreen.js`

This flow should be a top QA priority because duplicate refunds, stale requests, and illegal transitions are business-critical.

## Subscription Model Coupling

Subscriptions are restricted to `20l-ro-jar` in `server/src/routes/subscriptions.js`. Customer UI also assumes a 20L jar subscription. Future subscription products will require intentional changes to both backend validation and UI.

## Inventory Semantics

The backend does not deduct inventory for refill orders because jars are already at the customer. Product and subscription-start orders do deduct stock. This distinction is important and should be covered by tests.

## Data Cleanup Tools

Dev cleanup and seed routes in `server/src/routes/admin.js` are gated by `ADMIN_DEV_TOOLS_ENABLED=true`. `.env.example` correctly defaults this to false. Production Railway env must keep it disabled.

## Documentation Drift

`README.md` still describes an earlier simpler project shape and does not yet document the admin app, delivery-boy mode, Railway deployment, EAS APK workflow, GSD planning, or full MVP QA flows.

## CI/CD Gap

No GitHub Actions workflow is visible. At minimum, CI should run server syntax checks and both Expo Doctor checks before merges/builds.

## Database Governance

Supabase migrations exist and performance indexes were added. The project should continue using `supabase/migrations/` plus `supabase db push --linked` instead of manual SQL editor changes.

## Support For Production QA

The app is MVP feature-complete, but final readiness should be organized into phases:

1. Regression QA from clean demo state.
2. Native APK build validation on real Android devices.
3. Production environment and secrets audit.
4. Admin security hardening.
5. Automated backend business-rule tests.

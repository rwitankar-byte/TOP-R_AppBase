---
title: "TOP-R Water Integrations Map"
generated_at: "2026-06-28"
last_mapped_commit: "b290a5285ea543504ec75d0f97373c40c5b143ea"
focus: "tech"
---

# Integrations

## Supabase

Supabase is the primary database and auth provider.

- Server config: `server/src/config/supabase.js`
- Auth route: `server/src/routes/auth.js`
- Users route: `server/src/routes/users.js`
- Address route: `server/src/routes/addresses.js`
- Migrations: `supabase/migrations/`

`server/src/config/supabase.js` creates `supabaseAuth` with anon credentials and `supabaseAdmin` with service role when available. Most backend routes use `requireSupabase()` to fail fast when credentials are missing.

## Supabase Tables

The app uses tables for users, addresses, products, inventory, orders, order items, subscriptions, payments, transactions, delivery boys, and order assignments. Delivery-boy workflow is defined in `supabase/migrations/20260624182452_add_delivery_boy_workflow.sql`.

## Railway

The Express API is deployed on Railway.

- Railway config: `server/railway.json`
- Server start script: `server/package.json`
- Runtime binding: `server/src/index.js`

The server listens on `process.env.PORT || 4000` and host `0.0.0.0`, which is correct for Railway network binding.

## Razorpay

Razorpay is used for customer checkout and due payments.

- Backend SDK setup: `server/src/routes/payments.js`
- Customer cart checkout: `client/src/screens/CartScreen.js`
- Customer due payment: `client/src/screens/PaymentScreen.js`

Backend routes:

- `POST /payments/create-order`
- `POST /payments/verify`
- `GET /payments/:userId`
- `GET /payments/due/:userId`

Amounts sent to Razorpay are in paise. Supabase payment records store rupee amounts.

## Expo Push Notifications

Customer push notifications are handled with Expo notifications.

- Customer registration: `client/src/services/notifications.js`
- Token save API: `client/src/services/api.js`
- User push-token route: `server/src/routes/users.js`
- Backend sending utility: `server/src/services/notifications.js`

Notifications are triggered from order status updates, delivery assignment, delivery-boy updates, cancellation request, and refund completion flows.

## React Native Linking Support

Customer support links are configured centrally.

- Support constants: `client/src/config/support.js`
- Support UI: `client/src/screens/ProfileScreen.js`, `client/src/screens/FAQScreen.js`, `client/src/screens/LocateUsScreen.js`

The real TOP-R support details are in the customer app, including phone, WhatsApp, email, and Google Maps search link.

## Admin Header Integration

Admin-only routes use a shared header:

- Header name: `x-admin-key`
- Admin middleware: `server/src/middleware/admin.js`
- Admin API client: `admin/src/services/api.js`

The current admin key is hardcoded in the app and middleware. This is adequate for MVP/internal testing but is a production-readiness concern.

## IVR Refill Webhook

Phase 1 DTMF IVR ordering is handled by `server/src/routes/ivr.js`, mounted at `/ivr` from `server/src/index.js`.

Routes:

- `GET /ivr/health`
- `POST /ivr/order`

`POST /ivr/order` accepts caller phone, selected keypad quantity, and optional provider call id. It creates a 20L refill order with `source = ivr`, `payment_method = cash_on_delivery`, and `payment_status = pending`. The flow uses the customer's default address and active 20L subscription.

Implementation notes and provider handoff details are documented in `docs/IVR_ORDERING.md`.

## Dev Tools Integration

Admin dev tools are gated by `ADMIN_DEV_TOOLS_ENABLED=true`.

- Dev tools backend: `server/src/routes/admin.js`
- Dev tools UI: `admin/src/screens/DevToolsScreen.js`

Supported dev operations include test customer cleanup and demo data seeding.

## External Image URLs

Product images are currently remote Unsplash URLs seeded by backend/demo data.

- Demo products: `server/src/routes/admin.js`
- Dummy fallback products: `server/src/data/dummyProducts.js`
- Customer product image fallback: `client/src/components/ProductCard.js`

Customer UI safely shows a placeholder when an image URL fails.

---
title: "TOP-R Water Structure Map"
generated_at: "2026-06-28"
last_mapped_commit: "b290a5285ea543504ec75d0f97373c40c5b143ea"
focus: "arch"
---

# Structure

## Repository Layout

Top-level project folders:

- `client/` customer Expo app
- `admin/` admin and delivery-boy Expo app
- `server/` Express backend
- `supabase/` Supabase CLI config, migrations, and seed data
- `.codex/` local GSD Core install
- `.env.example` shared environment example

## Customer App Layout

Important customer paths:

- `client/App.js` stack navigator and notification setup
- `client/src/navigation/Tabs.js` bottom tab navigator
- `client/src/screens/` screen components
- `client/src/components/` reusable loading/error/empty/product UI
- `client/src/context/CartContext.js` cart provider
- `client/src/services/api.js` API client
- `client/src/services/session.js` AsyncStorage session helpers
- `client/src/services/notifications.js` optional push registration
- `client/src/config/support.js` real business support constants

Customer screens include auth, home, products, cart, subscriptions, profile, all orders, order calendar, favorite orders, address book, transaction history, return empty jar, order tracking, payments, FAQ, and locate us.

## Admin App Layout

Important admin paths:

- `admin/App.js` navigation and admin session gate
- `admin/src/screens/` operational screens
- `admin/src/components/` reusable loading/error/empty/header UI
- `admin/src/services/api.js` admin API client with `x-admin-key`
- `admin/src/services/session.js` admin session helpers
- `admin/src/utils/format.js` formatting and badge helpers
- `admin/src/utils/returnStatus.js` return-flow helpers

Admin screens include dashboard, orders, order detail, subscriptions, subscription detail, return requests, inventory, customers, customer detail, delivery boys, delivery login, delivery dashboard, analytics, dev tools, and login.

## Server Layout

Important backend paths:

- `server/src/index.js` Express bootstrap
- `server/src/config/supabase.js` Supabase clients
- `server/src/middleware/admin.js` admin header guard
- `server/src/routes/` route modules by domain
- `server/src/services/notifications.js` Expo push sender
- `server/src/utils/orderStatuses.js` status transition maps
- `server/src/utils/cache.js` in-memory TTL cache
- `server/src/utils/pagination.js` optional pagination formatter
- `server/src/data/dummyProducts.js` fallback product data

## Backend Route Modules

Route modules are intentionally domain-focused:

- `auth.js` OTP/test user flows
- `products.js` product list/detail
- `orders.js` order creation/list/status
- `subscriptions.js` subscription create/list/update
- `inventory.js` stock list/update
- `payments.js` Razorpay order/verify/history/due
- `addresses.js` CRUD/default address behavior
- `users.js` user profile and push token
- `admin.js` dashboard, analytics, customers, dev tools, delivery boys, assignment, return approval
- `delivery.js` delivery-boy assigned orders and status updates

## Supabase Layout

Supabase project files:

- `supabase/config.toml`
- `supabase/seed.sql`
- `supabase/migrations/20260601145227_remote_schema_baseline.sql`
- `supabase/migrations/20260608105414_remote_subscription_updates.sql`
- `supabase/migrations/20260623184530_add_return_status_flow.sql`
- `supabase/migrations/20260623185000_optimize_rls_auth_uid.sql`
- `supabase/migrations/20260624174635_expand_subscription_cancellation_workflow.sql`
- `supabase/migrations/20260624182452_add_delivery_boy_workflow.sql`
- `supabase/migrations/20260625112110_add_address_delivery_fields.sql`
- `supabase/migrations/20260628062157_add_performance_indexes.sql`

Legacy schema is also present at `server/supabase/schema.sql`.

## Naming Patterns

Screens use PascalCase filenames like `OrderDetailScreen.js`. Service files use lowercase names like `api.js` and `session.js`. Backend route files use plural domain names where appropriate.

## Build Config Locations

- Customer Expo config: `client/app.json`
- Customer EAS config: `client/eas.json`
- Admin Expo config: `admin/app.json`
- Admin EAS config: `admin/eas.json`
- Server Railway config: `server/railway.json`

## Planning Artifacts

GSD onboarding artifacts are expected under `.planning/`. This mapping command creates `.planning/codebase/` as a brownfield reference before project planning is initialized.

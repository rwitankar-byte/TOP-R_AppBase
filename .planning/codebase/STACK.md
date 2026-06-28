---
title: "TOP-R Water Codebase Stack Map"
generated_at: "2026-06-28"
last_mapped_commit: "b290a5285ea543504ec75d0f97373c40c5b143ea"
focus: "tech"
---

# Stack

## Overview

TOP-R Water is a brownfield MVP made of three main runtime surfaces:

- Customer mobile app in `client/`
- Admin and delivery-boy mobile app in `admin/`
- Node/Express API in `server/`

The apps are built as Expo React Native projects and talk to the deployed Railway backend at `https://top-rappbase-production.up.railway.app`.

## Customer App

- Location: `client/`
- Runtime: Expo SDK 54, React Native 0.81.5, React 19.1.0
- Entry point: `client/index.js`
- App shell: `client/App.js`
- Bottom tabs: `client/src/navigation/Tabs.js`
- Styling: NativeWind v2 with Tailwind config in `client/tailwind.config.js`
- Theme constants: `client/src/constants/theme.js`
- API wrapper: `client/src/services/api.js`
- Local session/address helpers: `client/src/services/session.js`
- Push notification wrapper: `client/src/services/notifications.js`
- Cart state: `client/src/context/CartContext.js`

Customer native dependencies include `react-native-razorpay`, `expo-notifications`, `expo-device`, `expo-constants`, `expo-location`, `react-native-calendars`, and `@react-native-community/datetimepicker`.

## Admin App

- Location: `admin/`
- Runtime: Expo SDK 54, React Native 0.81.5, React 19.1.0
- Entry point: `admin/index.js`
- App shell and navigation: `admin/App.js`
- Styling: NativeWind v2 with Tailwind config in `admin/tailwind.config.js`
- API wrapper: `admin/src/services/api.js`
- Admin session helper: `admin/src/services/session.js`
- Formatting helpers: `admin/src/utils/format.js`
- Return status helper: `admin/src/utils/returnStatus.js`

The admin app intentionally avoids customer native modules such as Razorpay and notifications. It includes admin, delivery-boy, analytics, inventory, customer, dev-tools, return-request, and detail screens.

## Backend

- Location: `server/`
- Runtime: Node.js >= 20 with ES modules
- Entry point: `server/src/index.js`
- Framework: Express 4
- Database/API client: `@supabase/supabase-js`
- Payment gateway SDK: `razorpay`
- Push notification SDK: `expo-server-sdk`
- Response compression: `compression`
- Request logging: `morgan`
- Deployment config: `server/railway.json`

`server/src/index.js` binds to `0.0.0.0` and uses `process.env.PORT || 4000`, which fits Railway and local development.

## Database And Migrations

- Supabase CLI config: `supabase/config.toml`
- Migrations: `supabase/migrations/`
- Legacy schema reference: `server/supabase/schema.sql`
- Seed data: `supabase/seed.sql`

Important migrations include delivery-boy workflow in `supabase/migrations/20260624182452_add_delivery_boy_workflow.sql`, address fields in `supabase/migrations/20260625112110_add_address_delivery_fields.sql`, and performance indexes in `supabase/migrations/20260628062157_add_performance_indexes.sql`.

## Build And Deployment

- Customer EAS config: `client/eas.json`
- Customer Android package: `com.topr.water` in `client/app.json`
- Admin EAS config: `admin/eas.json`
- Admin Android package: `com.topr.water.admin` in `admin/app.json`
- Server deployment: Railway Nixpacks via `server/railway.json`

Both Expo projects have `development` and `preview` APK profiles. The customer app has an EAS project id in `client/app.json`; the admin app has an EAS project id in `admin/app.json`.

## Environment

Tracked example config is in `.env.example`. It lists:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `ADMIN_DEV_TOOLS_ENABLED=false`
- `PORT=4000`
- `EXPO_PUBLIC_CLIENT_API_URL=https://top-rappbase-production.up.railway.app`

Real secrets should stay in ignored `.env` files or deployment dashboards.

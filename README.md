# Water App

Customer-facing RO water jar delivery app built with Expo, Express, and Supabase.

## Structure

```text
water-app/
  client/   Expo React Native app
  server/   Node.js + Express API
```

## Setup

1. Copy `.env.example` into `server/.env` and `client/.env`.
2. Add Supabase credentials.
3. Run the SQL in `server/supabase/schema.sql`, then `server/supabase/seed.sql`.

## Run

```bash
cd server
npm install
npm run dev
```

```bash
cd client
npm install
npm start
```

The client includes dummy product data and local cart state so the main shopping flow works before connecting a live Supabase project.

---
title: "TOP-R Water Conventions Map"
generated_at: "2026-06-28"
last_mapped_commit: "b290a5285ea543504ec75d0f97373c40c5b143ea"
focus: "quality"
---

# Conventions

## JavaScript Style

The project uses plain JavaScript, not TypeScript. Files use ES module imports in the server and React function components in the apps.

Backend modules generally follow:

- Import dependencies at top
- Create `Router()`
- Define route handlers with `async (req, res, next)`
- Use `try/catch` and pass failures to `next(error)`
- Export router as default

Examples: `server/src/routes/orders.js`, `server/src/routes/payments.js`, `server/src/routes/admin.js`.

## React Native Style

Screens are function components with hooks:

- `useState` for local data
- `useEffect` and `useFocusEffect` for loading
- `useCallback` for fetch functions
- `useMemo` for filtering/sorting when needed

Examples: `client/src/screens/AllOrdersScreen.js`, `admin/src/screens/OrdersScreen.js`, `admin/src/screens/CustomersScreen.js`.

## Styling Convention

Both apps use NativeWind class names. Primary colors are:

- Teal: `#00B5B0`
- Yellow: `#FFD700`
- White backgrounds

Reusable states are in:

- `client/src/components/LoadingState.js`
- `client/src/components/ErrorState.js`
- `client/src/components/EmptyState.js`
- `admin/src/components/LoadingState.js`
- `admin/src/components/ErrorState.js`
- `admin/src/components/EmptyState.js`

## API Client Convention

Both app API clients use one internal `request()` helper.

- Customer: `client/src/services/api.js`
- Admin: `admin/src/services/api.js`

Both enforce a 10 second timeout with `AbortController`. The admin client adds `x-admin-key` to every request.

## Backend Error Convention

Backend errors use `error.status` when needed. `server/src/index.js` centralizes error responses:

```js
res.status(error.status || 500).json({ error: error.message || "Internal server error" });
```

Routes return clear 400 messages for validation failures such as missing `address_id`, invalid refill quantity, invalid status transition, and missing payment details.

## Status Convention

Order status transitions are centralized in `server/src/utils/orderStatuses.js`. UI should not invent transitions independently without matching backend rules.

Normal order statuses include `Placed`, `Confirmed`, `Assigned`, `Picked Up`, `Delivered`, and `Cancelled`.

Return statuses include `Placed`, `Confirmed`, `Assigned`, `Picked Up`, `Returned`, `Refund Completed`, and `Cancelled`.

## Data Fetching Convention

Screens commonly define `loadX()` functions that:

1. Set loading state only on initial/manual load.
2. Call the API service.
3. Save response to state.
4. Show `Alert` and `ErrorState` on failures.
5. Preserve old data during refresh where implemented.

Examples: `client/src/screens/OrderTrackingScreen.js`, `admin/src/screens/DashboardScreen.js`, `admin/src/screens/OrderDetailScreen.js`.

## Session Convention

Customer session helpers are in `client/src/services/session.js`. Admin session helpers are in `admin/src/services/session.js`. The customer app includes guest/test session support for OTP-cost-free testing.

## Configuration Convention

Runtime secrets are not tracked. `.env.example` documents expected variables. Mobile apps use deployed backend URLs by default.

## Comments And Debug Logs

The codebase still contains several `console.log` statements in checkout and backend order creation paths, especially `client/src/screens/CartScreen.js` and `server/src/routes/orders.js`. These are useful for MVP debugging but should be reviewed before production release.

export const BASE_URL = "https://top-rappbase-production.up.railway.app";
const ADMIN_KEY = "topr-admin-2024";

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": ADMIN_KEY,
      ...(options.headers || {})
    }
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }
  return payload;
}

export const api = {
  getOrders: (status) => request(`/orders${status && status !== "All" ? `?status=${encodeURIComponent(status)}` : ""}`),
  getSubscriptionRefills: (subscriptionId) =>
    request(`/orders?subscription_id=${encodeURIComponent(subscriptionId)}&type=refill`),
  getReturnRequests: () => request("/orders/returns"),
  updateOrderStatus: (id, status) =>
    request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getSubscriptions: (status) =>
    request(`/subscriptions${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  updateSubscription: (id, updates) =>
    request(`/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  getInventory: () => request("/inventory"),
  updateInventory: (productId, quantity) =>
    request(`/inventory/${productId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity_available: quantity })
    }),
  getUsers: () => request("/users"),
  advanceReturn: (orderId, targetStatus) =>
    request("/admin/approve-return", { method: "POST", body: JSON.stringify({ order_id: orderId, target_status: targetStatus }) })
};

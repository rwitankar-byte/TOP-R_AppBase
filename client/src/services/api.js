const API_URL = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_CLIENT_API_URL || "https://top-rappbase-production.up.railway.app";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Request failed");
  }
  return payload;
}

export const api = {
  sendOtp: (phone) => request("/auth/send-otp", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone, token) =>
    request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, token }) }),
  getProducts: () => request("/products"),
  getUser: (userId) => request(`/users/${userId}`),
  updatePushToken: (userId, pushToken) =>
    request(`/users/${userId}/push-token`, { method: "PATCH", body: JSON.stringify({ push_token: pushToken }) }),
  getAddresses: (userId) => request(`/addresses/${userId}`),
  addAddress: (address) => request("/addresses", { method: "POST", body: JSON.stringify(address) }),
  updateAddress: (id, updates) => request(`/addresses/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  deleteAddress: (id) => request(`/addresses/${id}`, { method: "DELETE" }),
  placeOrder: (order) => request("/orders", { method: "POST", body: JSON.stringify(order) }),
  getOrders: (userId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.set("type", filters.type);
    if (filters.status) params.set("status", filters.status);
    const query = params.toString();
    return request(`/orders/${userId}${query ? `?${query}` : ""}`);
  },
  getSubscriptions: (userId, status) => request(`/subscriptions/${userId}${status ? `?status=${status}` : ""}`),
  createSubscription: (subscription) =>
    request("/subscriptions", { method: "POST", body: JSON.stringify(subscription) }),
  updateSubscription: (id, updates) =>
    request(`/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  getPayments: (userId) => request(`/payments/${userId}`),
  getDue: (userId) => request(`/payments/due/${userId}`),
  createRazorpayOrder: (payment) =>
    request("/payments/create-order", { method: "POST", body: JSON.stringify(payment) }),
  verifyRazorpayPayment: (payment) =>
    request("/payments/verify", { method: "POST", body: JSON.stringify(payment) })
};

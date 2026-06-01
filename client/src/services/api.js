const API_URL = process.env.EXPO_PUBLIC_CLIENT_API_URL || "http://192.168.29.179:4000";

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
  getAddresses: (userId) => request(`/addresses/${userId}`),
  addAddress: (address) => request("/addresses", { method: "POST", body: JSON.stringify(address) }),
  updateAddress: (id, updates) => request(`/addresses/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  deleteAddress: (id) => request(`/addresses/${id}`, { method: "DELETE" }),
  placeOrder: (order) => request("/orders", { method: "POST", body: JSON.stringify(order) }),
  getOrders: (userId) => request(`/orders/${userId}`),
  getSubscriptions: (userId, status) => request(`/subscriptions/${userId}${status ? `?status=${status}` : ""}`),
  createSubscription: (subscription) =>
    request("/subscriptions", { method: "POST", body: JSON.stringify(subscription) }),
  updateSubscription: (id, updates) =>
    request(`/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  getPayments: (userId) => request(`/payments/${userId}`),
  getDue: (userId) => request(`/payments/due/${userId}`)
};

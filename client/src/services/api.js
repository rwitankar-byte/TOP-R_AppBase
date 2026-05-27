const API_URL = process.env.EXPO_PUBLIC_CLIENT_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  const payload = await response.json().catch(() => null);
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
  placeOrder: (order) => request("/orders", { method: "POST", body: JSON.stringify(order) }),
  getPayments: (userId) => request(`/payments/${userId}`),
  getDue: (userId) => request(`/payments/due/${userId}`)
};

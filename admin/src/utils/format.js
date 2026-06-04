export function shortId(id) {
  return id ? `#${String(id).slice(0, 8)}` : "#--------";
}

export function money(value) {
  return `₹${Number(value || 0).toFixed(0)}`;
}

export function dateTime(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function nextDeliveryDate(subscription) {
  const start = new Date(subscription.start_date);
  const today = new Date();
  if (Number.isNaN(start.getTime()) || start >= today) return subscription.start_date || "Not set";

  const next = new Date(start);
  const step = subscription.frequency === "Daily" ? 1 : 7;
  while (next < today) next.setDate(next.getDate() + step);
  return next.toISOString().slice(0, 10);
}

export function statusClass(status) {
  return {
    Placed: "bg-blue-100 text-blue-700",
    Confirmed: "bg-orange-100 text-orange-700",
    "Out for Delivery": "bg-yellow-100 text-yellow-700",
    Delivered: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
    Active: "bg-green-100 text-green-700",
    Paused: "bg-orange-100 text-orange-700",
    Pending: "bg-blue-100 text-blue-700"
  }[status] || "bg-gray-100 text-gray-700";
}

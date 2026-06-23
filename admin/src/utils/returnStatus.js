export const RETURN_VALID_TRANSITIONS = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Out for Return"],
  "Out for Return": ["Picked Up"],
  "Picked Up": [],
  Cancelled: []
};

export function getReturnActions(status) {
  const labels = {
    Confirmed: "Confirm Pickup",
    "Out for Return": "Mark Out for Return",
    "Picked Up": "Mark Picked Up",
    Cancelled: "Reject"
  };
  return (RETURN_VALID_TRANSITIONS[status] || []).map((nextStatus) => ({
    status: nextStatus,
    label: labels[nextStatus],
    destructive: nextStatus === "Cancelled"
  }));
}

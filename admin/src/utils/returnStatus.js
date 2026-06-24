export const RETURN_VALID_TRANSITIONS = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Picked Up"],
  "Out for Return": ["Picked Up"],
  "Picked Up": ["Returned"],
  Returned: ["Refund Completed"],
  "Refund Completed": ["Cancelled"],
  Cancelled: []
};

export function getReturnActions(status) {
  const labels = {
    Confirmed: "Confirm Pickup",
    "Picked Up": "Mark Picked Up",
    Returned: "Mark Returned",
    "Refund Completed": "Process Refund",
    Cancelled: status === "Placed" ? "Reject" : "Mark Cancelled"
  };
  return (RETURN_VALID_TRANSITIONS[status] || []).map((nextStatus) => ({
    status: nextStatus,
    label: labels[nextStatus],
    destructive: nextStatus === "Cancelled"
  }));
}

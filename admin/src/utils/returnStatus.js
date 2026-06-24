export const RETURN_VALID_TRANSITIONS = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: [],
  Assigned: [],
  "Out for Return": [],
  "Picked Up": [],
  Returned: ["Refund Completed"],
  "Refund Completed": ["Cancelled"],
  Cancelled: []
};

export function getReturnActions(status) {
  const labels = {
    Confirmed: "Confirm Pickup",
    Assigned: "Assigned to Delivery Boy",
    "Refund Completed": "Process Refund",
    Cancelled: status === "Placed" ? "Reject" : "Mark Cancelled"
  };
  return (RETURN_VALID_TRANSITIONS[status] || []).map((nextStatus) => ({
    status: nextStatus,
    label: labels[nextStatus],
    destructive: nextStatus === "Cancelled"
  }));
}

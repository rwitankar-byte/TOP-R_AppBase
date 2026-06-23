export const VALID_TRANSITIONS = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Out for Delivery", "Cancelled"],
  "Out for Delivery": ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: []
};

export const RETURN_VALID_TRANSITIONS = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Out for Return"],
  "Out for Return": ["Picked Up"],
  "Picked Up": [],
  Cancelled: []
};

export function assertValidStatusTransition(currentStatus, newStatus, orderType = "delivery") {
  const transitions = orderType === "return" ? RETURN_VALID_TRANSITIONS : VALID_TRANSITIONS;
  const allowedStatuses = transitions[currentStatus] || [];
  if (allowedStatuses.includes(newStatus)) return;

  const finalStateMessage = allowedStatuses.length === 0 ? " Order is in a final state." : "";
  const error = new Error(`Cannot change status from ${currentStatus} to ${newStatus}.${finalStateMessage}`);
  error.status = 400;
  throw error;
}

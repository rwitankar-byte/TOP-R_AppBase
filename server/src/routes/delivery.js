import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { sendPushNotification, shortOrderId } from "../services/notifications.js";
import { assertValidStatusTransition } from "../utils/orderStatuses.js";

const router = Router();
const ACTIVE_DELIVERY_STATUSES = ["Assigned", "Out for Delivery", "Picked Up"];

async function findReturnSubscription(supabase, order) {
  if (order.subscription_id) {
    const { data, error } = await supabase.from("subscriptions").select("id").eq("id", order.subscription_id).single();
    if (error) throw error;
    return data;
  }
  return null;
}

router.get("/:deliveryBoyId/orders", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data: deliveryBoy, error: deliveryBoyError } = await supabase
      .from("delivery_boys")
      .select("id,name,phone,is_active")
      .eq("id", req.params.deliveryBoyId)
      .single();
    if (deliveryBoyError) throw deliveryBoyError;
    if (!deliveryBoy.is_active) return res.status(403).json({ error: "Delivery boy is inactive" });

    const { data, error } = await supabase
      .from("orders")
      .select("*, users(phone,name), addresses(*), delivery_boys(id,name,phone), order_items(*, products(*))")
      .eq("delivery_boy_id", deliveryBoy.id)
      .in("status", ACTIVE_DELIVERY_STATUSES)
      .order("assigned_at", { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

router.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const { delivery_boy_id, status } = req.body;
    if (!delivery_boy_id || !status) return res.status(400).json({ error: "delivery_boy_id and status are required" });

    const supabase = requireSupabase();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", req.params.id)
      .single();
    if (orderError) throw orderError;
    if (order.delivery_boy_id !== delivery_boy_id) return res.status(403).json({ error: "This order is not assigned to this delivery boy" });

    const orderType = order.type || order.order_type || "regular";
    assertValidStatusTransition(order.status, status, orderType);
    const isReturn = orderType === "return";
    const expectedStatus = order.status === "Assigned" ? "Picked Up" : isReturn ? "Returned" : "Delivered";
    if (status !== expectedStatus) {
      return res.status(400).json({ error: `Delivery boys can only change ${order.status} to ${expectedStatus}` });
    }

    const now = new Date().toISOString();
    const updates = { status };
    if (status === "Picked Up") updates.picked_up_at = now;
    if (status === "Delivered" || status === "Returned") updates.delivered_at = now;

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", order.id)
      .eq("status", order.status)
      .select("*, users(phone,name), addresses(*), delivery_boys(id,name,phone), order_items(*, products(*))")
      .single();
    if (updateError) throw updateError;

    const { error: assignmentError } = await supabase
      .from("order_assignments")
      .update({ status })
      .eq("order_id", order.id)
      .eq("delivery_boy_id", delivery_boy_id);
    if (assignmentError) throw assignmentError;

    if (isReturn) {
      const subscription = await findReturnSubscription(supabase, order);
      if (subscription) {
        const subscriptionStatus = status === "Picked Up" ? "Picked Up" : "Returned";
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .update({ status: subscriptionStatus, return_status: subscriptionStatus })
          .eq("id", subscription.id);
        if (subscriptionError) throw subscriptionError;
      }
    }

    if (isReturn && status === "Picked Up") {
      sendPushNotification(
        updatedOrder.user_id,
        "Empty jars picked up",
        "Your empty jars have been picked up.",
        { type: "return_picked_up", orderId: updatedOrder.id, status }
      );
    } else if (!isReturn && status === "Picked Up") {
      sendPushNotification(
        updatedOrder.user_id,
        "Order picked up",
        `Your order #${shortOrderId(updatedOrder.id)} is out for delivery.`,
        { type: "order_picked_up", orderId: updatedOrder.id, status }
      );
    } else if (!isReturn && status === "Delivered") {
      sendPushNotification(
        updatedOrder.user_id,
        "Order delivered",
        `Your order #${shortOrderId(updatedOrder.id)} has been delivered.`,
        { type: "order_delivered", orderId: updatedOrder.id, status }
      );
    }

    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
});

export default router;

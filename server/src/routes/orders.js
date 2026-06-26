import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";
import { sendPushNotification, shortOrderId } from "../services/notifications.js";
import { VALID_TRANSITIONS, RETURN_VALID_TRANSITIONS, assertValidStatusTransition } from "../utils/orderStatuses.js";

const router = Router();
const ACTIONABLE_RETURN_SUBSCRIPTION_STATUSES = ["Cancellation Requested", "Return Pending", "Picked Up", "Returned"];
const ORDER_STATUS_NOTIFICATIONS = {
  Confirmed: (order) => ({
    title: "Order confirmed",
    body: `Your order #${shortOrderId(order.id)} has been confirmed.`,
    type: "order_confirmed"
  }),
  "Picked Up": (order) => ({
    title: "Order picked up",
    body: `Your order #${shortOrderId(order.id)} is out for delivery.`,
    type: "order_picked_up"
  }),
  Delivered: (order) => ({
    title: "Order delivered",
    body: `Your order #${shortOrderId(order.id)} has been delivered.`,
    type: "order_delivered"
  })
};

export { VALID_TRANSITIONS, RETURN_VALID_TRANSITIONS, assertValidStatusTransition };

export function validateRefillItems({ subscription, userId, items }) {
  if (subscription.user_id !== userId || subscription.status !== "Active") {
    const error = new Error("Refills require an active subscription owned by this customer");
    error.status = 400;
    throw error;
  }

  const refillQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const availableJars = Number(subscription.jar_count || subscription.quantity || 0);
  if (refillQuantity > availableJars) {
    const error = new Error(`Refill quantity cannot exceed the ${availableJars} jars in this subscription`);
    error.status = 400;
    throw error;
  }
  if (items.some((item) => item.product_id !== subscription.product_id)) {
    const error = new Error("Refill product must match the subscription product");
    error.status = 400;
    throw error;
  }

  return items.map((item) => ({ ...item, unit_price: 40 }));
}

export function validateReturnRequest({ subscription, userId, items }) {
  if (subscription.user_id !== userId || !["Active", "Paused"].includes(subscription.status) || subscription.deposit_refunded) {
    const error = new Error("Return requests require an active or paused subscription owned by this customer");
    error.status = 400;
    throw error;
  }
  const returnedJars = items.reduce((sum, item) => sum + item.quantity, 0);
  const subscribedJars = Number(subscription.jar_count || subscription.quantity || 0);
  if (returnedJars !== subscribedJars || items.some((item) => item.product_id !== subscription.product_id)) {
    const error = new Error("A return request must include every jar from the matching subscription");
    error.status = 400;
    throw error;
  }
}

function applyOrderFilters(query, req) {
  let nextQuery = query;
  if (req.query.status) {
    nextQuery = nextQuery.eq("status", req.query.status);
  }
  if (req.query.type) {
    nextQuery = nextQuery.eq("type", req.query.type);
  }
  if (req.query.subscription_id) {
    nextQuery = nextQuery.eq("subscription_id", req.query.subscription_id);
  }
  return nextQuery;
}

async function fetchOrders(req, { userId, returnsOnly = false, pendingOnly = false } = {}) {
  const supabase = requireSupabase();
  let query = supabase
    .from("orders")
    .select("*, users(phone,name), addresses(*), delivery_boys(id,name,phone), order_items(*, products(*)), payments(amount,status,method)")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }
  if (returnsOnly) {
    query = query.eq("type", "return");
  } else {
    query = applyOrderFilters(query, req);
  }
  if (pendingOnly) {
    query = query.eq("status", "Placed");
  }

  let { data, error } = await query;
  if (error?.message?.includes("type")) {
    let fallbackQuery = supabase
      .from("orders")
      .select("*, users(phone,name), addresses(*), delivery_boys(id,name,phone), order_items(*, products(*)), payments(amount,status,method)")
      .order("created_at", { ascending: false });
    if (userId) {
      fallbackQuery = fallbackQuery.eq("user_id", userId);
    }
    if (returnsOnly || req.query.type) {
      fallbackQuery = fallbackQuery.eq("order_type", returnsOnly ? "return" : req.query.type);
    }
    if (req.query.status || pendingOnly) {
      fallbackQuery = fallbackQuery.eq("status", pendingOnly ? "Placed" : req.query.status);
    }
    if (req.query.subscription_id) {
      fallbackQuery = fallbackQuery.eq("subscription_id", req.query.subscription_id);
    }
    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
  }
  if (error) throw error;
  return data || [];
}

async function attachSubscriptionsToReturns(returnOrders) {
  if (!returnOrders.length) return returnOrders;
  const supabase = requireSupabase();
  const userIds = [...new Set(returnOrders.map((order) => order.user_id).filter(Boolean))];
  if (!userIds.length) return returnOrders;

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("*, products(*)")
    .in("user_id", userIds);
  if (error) throw error;

  return returnOrders.map((order) => {
    const firstItem = order.order_items?.[0];
    const subscription =
      (subscriptions || []).find((item) => item.id === order.subscription_id) ||
      (subscriptions || []).find(
        (item) =>
          item.user_id === order.user_id &&
          (!firstItem?.product_id || item.product_id === firstItem.product_id) &&
          item.deposit_refunded !== true
      );
    return {
      ...order,
      subscription,
      subscription_id: order.subscription_id || subscription?.id || null,
      jar_count: subscription?.jar_count || subscription?.quantity || firstItem?.quantity || 1
    };
  });
}

router.post("/", async (req, res, next) => {
  try {
    console.log("POST /orders body:", JSON.stringify(req.body));
    const { user_id, address_id, items = [], total_amount, delivery_date, type = "delivery", payment_id, subscription_id } = req.body;
    const orderType = ["delivery", "return", "refill", "subscription"].includes(type) ? type : "delivery";
    const storedOrderType = orderType === "delivery" ? "regular" : orderType;
    if (!user_id || !items.length || (orderType !== "return" && !address_id)) {
      return res.status(400).json({ error: "user_id, address_id, and items are required" });
    }

    const supabase = requireSupabase();
    let normalizedItems = items.map((item) => ({
      product_id: item.product_id || item.id,
      quantity: Number(item.quantity || 0),
      unit_price: orderType === "return" ? 0 : Number(item.unit_price ?? item.price ?? 0)
    }));

    if (normalizedItems.some((item) => !item.product_id || item.quantity <= 0 || item.unit_price < 0)) {
      return res.status(400).json({ error: "Each item requires product_id, quantity, and unit_price" });
    }

    let returnSubscription = null;
    if (orderType === "return") {
      if (!subscription_id) {
        return res.status(400).json({ error: "subscription_id is required for return requests" });
      }
      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("id,user_id,product_id,jar_count,quantity,status,deposit_refunded")
        .eq("id", subscription_id)
        .single();
      if (subscriptionError) throw subscriptionError;
      validateReturnRequest({ subscription, userId: user_id, items: normalizedItems });
      returnSubscription = subscription;
    }

    if (orderType === "refill") {
      if (!subscription_id) {
        return res.status(400).json({ error: "subscription_id is required for refill orders" });
      }

      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("id,user_id,product_id,jar_count,quantity,status")
        .eq("id", subscription_id)
        .single();
      if (subscriptionError) throw subscriptionError;
      normalizedItems = validateRefillItems({ subscription, userId: user_id, items: normalizedItems });
    }

    if (orderType === "subscription") {
      if (!subscription_id) return res.status(400).json({ error: "subscription_id is required for subscription orders" });
      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("id,user_id,product_id,status")
        .eq("id", subscription_id)
        .single();
      if (subscriptionError) throw subscriptionError;
      if (subscription.user_id !== user_id || subscription.product_id !== normalizedItems[0]?.product_id) {
        return res.status(400).json({ error: "Subscription order must match the customer and subscription product" });
      }
    }

    const computedTotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const orderTotal = orderType === "refill" ? computedTotal : parseFloat(req.body.total_amount) || computedTotal;
    const orderPayload = {
      user_id,
      address_id: address_id || null,
      total_amount: orderTotal,
      delivery_date,
      status: "Placed",
      type: storedOrderType,
      subscription_id: ["refill", "return", "subscription"].includes(orderType) ? subscription_id : null
    };
    let { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();
    if (orderError?.message?.includes("type")) {
      const { type, ...fallbackPayload } = orderPayload;
      const fallback = await supabase.from("orders").insert({ ...fallbackPayload, order_type: orderType }).select().single();
      order = fallback.data;
      orderError = fallback.error;
    }
    if (orderError) throw orderError;
    console.log("POST /orders saved order:", JSON.stringify(order));

    const orderItems = normalizedItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    if (returnSubscription) {
      const { error: subscriptionError } = await supabase
        .from("subscriptions")
      .update({
        status: "Cancellation Requested",
        return_status: "Cancellation Requested",
        cancel_requested_at: new Date().toISOString()
      })
      .eq("id", returnSubscription.id)
      .in("status", ["Active", "Paused"]);
      if (subscriptionError) throw subscriptionError;
      sendPushNotification(
        returnSubscription.user_id,
        "Cancellation requested",
        "Your subscription cancellation request has been submitted.",
        { type: "subscription_cancellation_requested", orderId: order.id, subscriptionId: returnSubscription.id }
      );
    }

    for (const item of normalizedItems) {
      if (orderType === "return" || orderType === "refill") continue;
      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, quantity_available")
        .eq("product_id", item.product_id)
        .maybeSingle();
      if (inventoryError) throw inventoryError;
      if (inventory) {
        const nextQuantity = Math.max(Number(inventory.quantity_available) - item.quantity, 0);
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ quantity_available: nextQuantity, last_updated: new Date().toISOString() })
          .eq("id", inventory.id);
        if (updateError) throw updateError;
      }
    }

    if (payment_id) {
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ order_id: order.id })
        .eq("id", payment_id)
        .eq("user_id", user_id);
      if (paymentError) throw paymentError;
    }

    res.status(201).json({ ...order, items: orderItems });
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    res.json(await fetchOrders(req));
  } catch (error) {
    next(error);
  }
});

router.get("/returns", requireAdmin, async (req, res, next) => {
  try {
    const returns = await fetchOrders(req, { returnsOnly: true });
    const attachedReturns = await attachSubscriptionsToReturns(returns);
    res.json(
      attachedReturns.filter((order) => ACTIONABLE_RETURN_SUBSCRIPTION_STATUSES.includes(order.subscription?.status))
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:userId", async (req, res, next) => {
  try {
    res.json(await fetchOrders(req, { userId: req.params.userId }));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });
    const supabase = requireSupabase();
    let { data: existingOrder, error: existingOrderError } = await supabase
      .from("orders")
      .select("id,status,type")
      .eq("id", req.params.id)
      .single();
    if (existingOrderError?.message?.includes("type")) {
      const fallback = await supabase
        .from("orders")
        .select("id,status,order_type")
        .eq("id", req.params.id)
        .single();
      existingOrder = fallback.data;
      existingOrderError = fallback.error;
    }
    if (existingOrderError) throw existingOrderError;

    const existingOrderType = existingOrder.type || existingOrder.order_type;
    if (existingOrderType === "return") {
      return res.status(400).json({ error: "Use the staged return action to update a return request" });
    }
    assertValidStatusTransition(existingOrder.status, status, existingOrderType);

    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    const notification = ORDER_STATUS_NOTIFICATIONS[status]?.(data);
    if (notification) {
      sendPushNotification(
        data.user_id,
        notification.title,
        notification.body,
        { type: notification.type, orderId: data.id, status }
      );
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

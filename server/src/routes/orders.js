import { Router } from "express";
import { Expo } from "expo-server-sdk";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();
const expo = new Expo();

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
    .select("*, users(phone,name), addresses(*), order_items(*, products(*))")
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
      .select("*, users(phone,name), addresses(*), order_items(*, products(*))")
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
    const subscription = (subscriptions || []).find(
      (item) =>
        item.user_id === order.user_id &&
        (!firstItem?.product_id || item.product_id === firstItem.product_id) &&
        item.deposit_refunded !== true
    );
    return {
      ...order,
      subscription,
      subscription_id: subscription?.id || null,
      jar_count: subscription?.jar_count || subscription?.quantity || firstItem?.quantity || 1
    };
  });
}

async function notifyOrderStatus(orderId, status) {
  try {
    const supabase = requireSupabase();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("user_id")
      .eq("id", orderId)
      .single();
    if (orderError) throw orderError;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("push_token")
      .eq("id", order.user_id)
      .single();
    if (userError) throw userError;

    if (!user?.push_token || !Expo.isExpoPushToken(user.push_token)) {
      return;
    }

    const tickets = await expo.sendPushNotificationsAsync([
      {
        to: user.push_token,
        sound: "default",
        title: "Order Update",
        body: `Your order is now: ${status}`,
        data: { orderId, status }
      }
    ]);
    console.log("Order status push notification queued:", JSON.stringify(tickets));
  } catch (error) {
    console.error("Failed to send order status notification", error.message);
  }
}

router.post("/", async (req, res, next) => {
  try {
    console.log("POST /orders body:", JSON.stringify(req.body));
    const { user_id, address_id, items = [], total_amount, delivery_date, type = "delivery", payment_id, subscription_id } = req.body;
    const orderType = ["delivery", "return", "refill"].includes(type) ? type : "delivery";
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

    const computedTotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const orderTotal = orderType === "refill" ? computedTotal : parseFloat(req.body.total_amount) || computedTotal;
    const orderPayload = {
      user_id,
      address_id: address_id || null,
      total_amount: orderTotal,
      delivery_date,
      status: "Placed",
      order_type: orderType,
      subscription_id: orderType === "refill" ? subscription_id : null
    };
    let { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();
    if (orderError?.message?.includes("order_type")) {
      const { order_type, ...fallbackPayload } = orderPayload;
      const fallback = await supabase.from("orders").insert({ ...fallbackPayload, type: orderType }).select().single();
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
    const returns = await fetchOrders(req, { returnsOnly: true, pendingOnly: true });
    res.json(await attachSubscriptionsToReturns(returns));
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
    const { data, error } = await requireSupabase()
      .from("orders")
      .update({ status })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    await notifyOrderStatus(req.params.id, status);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";
import { assertValidStatusTransition } from "../utils/orderStatuses.js";

const router = Router();
const JAR_DEPOSIT = 250;

router.use(requireAdmin);

router.get("/delivery-boys", async (_req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("delivery_boys")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name");
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

router.post("/delivery-boys", async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const phone = req.body.phone?.trim();
    if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });
    const { data, error } = await requireSupabase()
      .from("delivery_boys")
      .insert({ name, phone, is_active: req.body.is_active !== false })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.patch("/delivery-boys/:id", async (req, res, next) => {
  try {
    const updates = Object.fromEntries(
      Object.entries({ name: req.body.name?.trim(), phone: req.body.phone?.trim(), is_active: req.body.is_active })
        .filter(([, value]) => value !== undefined && value !== "")
    );
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No delivery boy fields to update" });
    const { data, error } = await requireSupabase()
      .from("delivery_boys")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.delete("/delivery-boys/:id", async (req, res, next) => {
  try {
    const { error } = await requireSupabase().from("delivery_boys").delete().eq("id", req.params.id);
    if (error) {
      error.status = error.code === "23503" ? 409 : undefined;
      if (error.code === "23503") error.message = "Cannot remove a delivery boy with assignment history. Deactivate them instead.";
      throw error;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/orders/:id/assign", async (req, res, next) => {
  try {
    const { delivery_boy_id, notes } = req.body;
    if (!delivery_boy_id) return res.status(400).json({ error: "delivery_boy_id is required" });

    const supabase = requireSupabase();
    const { data: deliveryBoy, error: deliveryBoyError } = await supabase
      .from("delivery_boys")
      .select("id,name,phone,is_active")
      .eq("id", delivery_boy_id)
      .single();
    if (deliveryBoyError) throw deliveryBoyError;
    if (!deliveryBoy.is_active) return res.status(400).json({ error: "Delivery boy is inactive" });

    const { data: existingOrder, error: orderError } = await supabase
      .from("orders")
      .select("id,status,type")
      .eq("id", req.params.id)
      .single();
    if (orderError) throw orderError;
    const orderType = existingOrder.type || "regular";
    assertValidStatusTransition(existingOrder.status, "Assigned", orderType);

    const assignedAt = new Date().toISOString();
    const { data: order, error: updateError } = await supabase
      .from("orders")
      .update({ delivery_boy_id, assigned_at: assignedAt, status: "Assigned" })
      .eq("id", existingOrder.id)
      .eq("status", existingOrder.status)
      .select("*, users(phone,name), addresses(*), delivery_boys(id,name,phone), order_items(*, products(*))")
      .single();
    if (updateError) throw updateError;

    const { error: assignmentError } = await supabase
      .from("order_assignments")
      .insert({ order_id: order.id, delivery_boy_id, assigned_at: assignedAt, status: "Assigned", notes: notes || null });
    if (assignmentError) throw assignmentError;

    res.status(201).json({ order, delivery_boy: deliveryBoy });
  } catch (error) {
    next(error);
  }
});

async function findReturnSubscription(supabase, order) {
  if (order.subscription_id) {
    const { data, error } = await supabase.from("subscriptions").select("*").eq("id", order.subscription_id).single();
    if (error) throw error;
    return data;
  }

  const firstItem = order.order_items?.[0];
  let query = supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", order.user_id)
    .eq("deposit_refunded", false)
    .neq("status", "Cancelled");
  if (firstItem?.product_id) query = query.eq("product_id", firstItem.product_id);
  const { data, error } = await query.order("start_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export function getReturnTransitionEffects(subscription, returnOrder, targetStatus) {
  if (targetStatus === "Confirmed") {
    return { subscriptionUpdates: { status: "Return Pending", return_status: "Return Pending" }, refundAmount: 0, transaction: null, walletCredit: false };
  }
  if (targetStatus === "Picked Up") {
    return { subscriptionUpdates: { status: "Picked Up", return_status: "Picked Up" }, refundAmount: 0, transaction: null, walletCredit: false };
  }
  if (targetStatus === "Returned") {
    return { subscriptionUpdates: { status: "Returned", return_status: "Returned" }, refundAmount: 0, transaction: null, walletCredit: false };
  }
  if (targetStatus === "Refund Completed") {
    const jars = Number(subscription.jar_count || subscription.quantity || returnOrder.order_items?.[0]?.quantity || 1);
    const refundAmount = subscription.deposit_refunded ? 0 : jars * JAR_DEPOSIT;
    return {
      subscriptionUpdates: { status: "Refund Completed", return_status: "Refund Completed", deposit_refunded: true },
      refundAmount,
      transaction: refundAmount
        ? {
            user_id: subscription.user_id,
            type: "refund_wallet",
            amount: refundAmount,
            description: `Refund completed to wallet for ${jars} returned jar(s)`
          }
        : null,
      walletCredit: refundAmount > 0
    };
  }
  if (targetStatus === "Cancelled") {
    const wasRejected = returnOrder.status === "Placed";
    return {
      subscriptionUpdates: wasRejected
        ? { status: "Active", return_status: null, cancel_requested_at: null }
        : { status: "Cancelled", return_status: "Cancelled" },
      refundAmount: 0,
      transaction: null,
      walletCredit: false
    };
  }
  return { subscriptionUpdates: null, refundAmount: 0, transaction: null, walletCredit: false };
}

router.post("/approve-return", async (req, res, next) => {
  try {
    const { order_id, target_status = "Confirmed" } = req.body;
    if (!order_id) return res.status(400).json({ error: "order_id is required" });

    const supabase = requireSupabase();
    const { data: returnOrder, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();
    if (orderError) throw orderError;
    if ((returnOrder.order_type || returnOrder.type) !== "return") {
      return res.status(400).json({ error: "This action is only available for return requests" });
    }

    const subscription = await findReturnSubscription(supabase, returnOrder);
    if (!subscription) return res.status(404).json({ error: "Subscription not found for this return request" });

    assertValidStatusTransition(returnOrder.status, target_status, "return");

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update({ status: target_status })
      .eq("id", returnOrder.id)
      .eq("status", returnOrder.status)
      .select("*, order_items(*)")
      .single();
    if (updateOrderError) throw updateOrderError;

    const { subscriptionUpdates, refundAmount, transaction, walletCredit } = getReturnTransitionEffects(subscription, returnOrder, target_status);

    let updatedSubscription = subscription;
    if (subscriptionUpdates) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update(subscriptionUpdates)
        .eq("id", subscription.id)
        .select("*, users(phone,name), products(*)")
        .single();
      if (error) throw error;
      updatedSubscription = data;
    }

    if (transaction) {
      if (walletCredit) {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("wallet_balance")
          .eq("id", subscription.user_id)
          .single();
        if (userError) throw userError;
        const { error: walletError } = await supabase
          .from("users")
          .update({ wallet_balance: Number(user.wallet_balance || 0) + refundAmount })
          .eq("id", subscription.user_id);
        if (walletError) throw walletError;
      }
      const { error: transactionError } = await supabase.from("transactions").insert(transaction);
      if (transactionError) throw transactionError;
    }

    res.json({
      success: true,
      order: updatedOrder,
      subscription: updatedSubscription,
      refund_amount: refundAmount,
      refund_method: target_status === "Refund Completed" ? "Wallet" : null
    });
  } catch (error) {
    next(error);
  }
});

export default router;

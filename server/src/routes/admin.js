import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";
import { assertValidStatusTransition } from "../utils/orderStatuses.js";

const router = Router();
const JAR_DEPOSIT = 250;

router.use(requireAdmin);

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
    return { subscriptionUpdates: { status: "Return Confirmed" }, refundAmount: 0, transaction: null };
  }
  if (targetStatus === "Cancelled") {
    return { subscriptionUpdates: { status: "Active" }, refundAmount: 0, transaction: null };
  }
  if (targetStatus === "Picked Up") {
    const jars = Number(subscription.jar_count || subscription.quantity || returnOrder.order_items?.[0]?.quantity || 1);
    const refundAmount = subscription.deposit_refunded ? 0 : jars * JAR_DEPOSIT;
    return {
      subscriptionUpdates: { status: "Cancelled", deposit_refunded: true },
      refundAmount,
      transaction: refundAmount
        ? {
            user_id: subscription.user_id,
            type: "refund_cod",
            amount: refundAmount,
            description: `Refund via COD - ₹${refundAmount} paid by delivery boy on jar pickup`
          }
        : null
    };
  }
  return { subscriptionUpdates: null, refundAmount: 0, transaction: null };
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

    const { subscriptionUpdates, refundAmount, transaction } = getReturnTransitionEffects(subscription, returnOrder, target_status);

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
      const { error: transactionError } = await supabase.from("transactions").insert(transaction);
      if (transactionError) throw transactionError;
    }

    res.json({
      success: true,
      order: updatedOrder,
      subscription: updatedSubscription,
      refund_amount: refundAmount,
      refund_method: target_status === "Picked Up" ? "COD" : null
    });
  } catch (error) {
    next(error);
  }
});

export default router;

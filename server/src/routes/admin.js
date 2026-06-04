import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();
const JAR_DEPOSIT = 250;

router.use(requireAdmin);

router.post("/approve-return", async (req, res, next) => {
  try {
    const { order_id, subscription_id, user_id, jar_count } = req.body;
    if (!order_id && !subscription_id) {
      return res.status(400).json({ error: "order_id or subscription_id is required" });
    }

    const supabase = requireSupabase();
    let returnOrder = null;
    if (order_id) {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", order_id)
        .single();
      if (error) throw error;
      returnOrder = data;
    }

    let subscription = null;
    if (subscription_id) {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("id", subscription_id)
        .single();
      if (error) throw error;
      subscription = data;
    } else if (returnOrder) {
      const firstItem = returnOrder.order_items?.[0];
      let query = supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user_id || returnOrder.user_id)
        .eq("deposit_refunded", false)
        .neq("status", "Cancelled");
      if (firstItem?.product_id) {
        query = query.eq("product_id", firstItem.product_id);
      }
      const { data, error } = await query.order("start_date", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      subscription = data;
    }

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found for return approval" });
    }

    const customerId = user_id || subscription.user_id || returnOrder?.user_id;
    const returnedJars = Math.max(
      1,
      Number(jar_count || subscription.jar_count || subscription.quantity || returnOrder?.order_items?.[0]?.quantity || 1)
    );
    const refundAmount = returnedJars * JAR_DEPOSIT;

    if (!subscription.deposit_refunded && refundAmount > 0) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("wallet_balance")
        .eq("id", customerId)
        .single();
      if (userError) throw userError;

      const { error: walletError } = await supabase
        .from("users")
        .update({ wallet_balance: Number(user.wallet_balance || 0) + refundAmount })
        .eq("id", customerId);
      if (walletError) throw walletError;

      const { error: transactionError } = await supabase.from("transactions").insert({
        user_id: customerId,
        type: "Wallet Refund",
        amount: refundAmount,
        description: `Admin approved jar deposit refund for ${returnedJars} returned jar(s)`
      });
      if (transactionError) throw transactionError;

      const { error: paymentError } = await supabase.from("payments").insert({
        user_id: customerId,
        order_id: order_id || null,
        amount: refundAmount,
        method: "Wallet Refund",
        status: "Refunded"
      });
      if (paymentError) throw paymentError;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .update({ deposit_refunded: true, status: "Cancelled" })
      .eq("id", subscription.id)
      .select("*, users(phone,name,wallet_balance), products(*)")
      .single();
    if (error) throw error;

    if (order_id) {
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "Delivered" })
        .eq("id", order_id);
      if (orderError) throw orderError;
    }

    res.json({
      success: true,
      subscription: data,
      refund_amount: subscription.deposit_refunded ? 0 : refundAmount
    });
  } catch (error) {
    next(error);
  }
});

export default router;

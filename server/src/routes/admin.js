import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();
const JAR_DEPOSIT = 250;

router.use(requireAdmin);

router.post("/approve-return", async (req, res, next) => {
  try {
    const { subscription_id } = req.body;
    if (!subscription_id) {
      return res.status(400).json({ error: "subscription_id is required" });
    }

    const supabase = requireSupabase();
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscription_id)
      .single();
    if (subscriptionError) throw subscriptionError;

    const refundAmount = Number(
      subscription.jar_deposit || Number(subscription.jar_count || subscription.quantity || 1) * JAR_DEPOSIT
    );

    if (!subscription.deposit_refunded && refundAmount > 0) {
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

      const { error: transactionError } = await supabase.from("transactions").insert({
        user_id: subscription.user_id,
        type: "Wallet Refund",
        amount: refundAmount,
        description: `Admin approved jar deposit refund for ${subscription.jar_count || subscription.quantity || 1} jar(s)`
      });
      if (transactionError) throw transactionError;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .update({ deposit_refunded: true, status: "Cancelled" })
      .eq("id", subscription_id)
      .select("*, users(phone,name,wallet_balance), products(*)")
      .single();
    if (error) throw error;

    res.json({ subscription: data, refund_amount: subscription.deposit_refunded ? 0 : refundAmount });
  } catch (error) {
    next(error);
  }
});

export default router;

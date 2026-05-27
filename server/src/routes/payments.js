import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";

const router = Router();

router.get("/due/:userId", async (req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("orders")
      .select("id,total_amount,payments(amount,status)")
      .eq("user_id", req.params.userId);
    if (error) throw error;

    const due = data.reduce((sum, order) => {
      const paid = (order.payments || [])
        .filter((payment) => payment.status === "Paid")
        .reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);
      return sum + Math.max(Number(order.total_amount) - paid, 0);
    }, 0);

    res.json({ user_id: req.params.userId, due_amount: due });
  } catch (error) {
    next(error);
  }
});

router.get("/:userId", async (req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("payments")
      .select("*")
      .eq("user_id", req.params.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { user_id, order_id, amount, method, status = "Paid" } = req.body;
    if (!user_id || !amount || !method) {
      return res.status(400).json({ error: "user_id, amount, and method are required" });
    }
    const { data, error } = await requireSupabase()
      .from("payments")
      .insert({ user_id, order_id, amount, method, status })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { user_id, product_id, address_id, frequency, start_date, quantity = 1 } = req.body;
    if (!user_id || !product_id || !address_id || !frequency || !start_date) {
      return res.status(400).json({ error: "user_id, product_id, address_id, frequency, and start_date are required" });
    }
    const { data, error } = await requireSupabase()
      .from("subscriptions")
      .insert({ user_id, product_id, address_id, frequency, start_date, quantity, status: "Active" })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/:userId", async (req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("subscriptions")
      .select("*, products(*), addresses(*)")
      .eq("user_id", req.params.userId)
      .order("start_date");
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const allowed = ["frequency", "start_date", "status", "quantity", "address_id"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const { data, error } = await requireSupabase()
      .from("subscriptions")
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

export default router;

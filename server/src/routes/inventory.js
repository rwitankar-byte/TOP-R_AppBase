import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("inventory")
      .select("*, products(name, unit)")
      .order("last_updated", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.patch("/update", async (req, res, next) => {
  try {
    const { product_id, quantity_available } = req.body;
    if (!product_id || quantity_available === undefined) {
      return res.status(400).json({ error: "product_id and quantity_available are required" });
    }
    const { data, error } = await requireSupabase()
      .from("inventory")
      .update({ quantity_available, last_updated: new Date().toISOString() })
      .eq("product_id", product_id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

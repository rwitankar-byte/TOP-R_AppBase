import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

router.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("users")
      .select("*, orders(id,total_amount,status,created_at, order_items(*, products(*)))")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("users")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "User not found" });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

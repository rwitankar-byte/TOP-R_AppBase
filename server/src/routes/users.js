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

router.patch("/:id/push-token", async (req, res, next) => {
  try {
    const { push_token } = req.body;
    if (!push_token) {
      return res.status(400).json({ error: "push_token is required" });
    }

    let { data, error } = await requireSupabase()
      .from("users")
      .update({ push_token })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error?.message?.includes("push_token")) {
      error.status = 500;
      error.message = "push_token column is missing. Run the users push token migration.";
    }
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

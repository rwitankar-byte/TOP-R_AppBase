import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";

const router = Router();

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

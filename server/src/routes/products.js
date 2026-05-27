import { Router } from "express";
import { requireSupabase, supabaseAdmin } from "../config/supabase.js";
import { dummyProducts } from "../data/dummyProducts.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    if (!supabaseAdmin) return res.json(dummyProducts);
    const { data, error } = await requireSupabase()
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    if (!supabaseAdmin) {
      const product = dummyProducts.find((item) => item.id === req.params.id);
      return product ? res.json(product) : res.status(404).json({ error: "Product not found" });
    }
    const { data, error } = await requireSupabase().from("products").select("*").eq("id", req.params.id).single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

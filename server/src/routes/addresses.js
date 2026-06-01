import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";

const router = Router();

router.get("/:userId", async (req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("addresses")
      .select("*")
      .eq("user_id", req.params.userId)
      .order("is_default", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { user_id, label, full_address, lat, lng, is_default = false } = req.body;
    if (!user_id || !label || !full_address) {
      return res.status(400).json({ error: "user_id, label, and full_address are required" });
    }
    const supabase = requireSupabase();
    if (is_default) {
      const { error: clearDefaultError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user_id);
      if (clearDefaultError) throw clearDefaultError;
    }
    const { data, error } = await supabase
      .from("addresses")
      .insert({ user_id, label, full_address, lat, lng, is_default })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { is_default, label, full_address, lat, lng } = req.body;
    const updates = Object.fromEntries(
      Object.entries({ is_default, label, full_address, lat, lng }).filter(([, value]) => value !== undefined)
    );

    if (is_default === true) {
      const { data: address, error: lookupError } = await supabase
        .from("addresses")
        .select("user_id")
        .eq("id", req.params.id)
        .single();
      if (lookupError) throw lookupError;

      const { error: clearDefaultError } = await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", address.user_id);
      if (clearDefaultError) throw clearDefaultError;
    }

    const { data, error } = await supabase
      .from("addresses")
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

router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await requireSupabase().from("addresses").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

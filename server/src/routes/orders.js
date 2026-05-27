import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { user_id, address_id, items = [], total_amount, delivery_date } = req.body;
    if (!user_id || !address_id || !items.length) {
      return res.status(400).json({ error: "user_id, address_id, and items are required" });
    }

    const supabase = requireSupabase();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ user_id, address_id, total_amount, delivery_date, status: "Placed" })
      .select()
      .single();
    if (orderError) throw orderError;

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    res.status(201).json({ ...order, items: orderItems });
  } catch (error) {
    next(error);
  }
});

router.get("/:userId", async (req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("orders")
      .select("*, order_items(*, products(*)), addresses(*)")
      .eq("user_id", req.params.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });
    const { data, error } = await requireSupabase()
      .from("orders")
      .update({ status })
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

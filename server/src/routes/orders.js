import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    console.log("POST /orders body:", JSON.stringify(req.body));
    const { user_id, address_id, items = [], total_amount, delivery_date, type = "delivery", payment_id } = req.body;
    const orderType = type === "return" ? "return" : "delivery";
    if (!user_id || !items.length || (orderType !== "return" && !address_id)) {
      return res.status(400).json({ error: "user_id, address_id, and items are required" });
    }

    const supabase = requireSupabase();
    const normalizedItems = items.map((item) => ({
      product_id: item.product_id || item.id,
      quantity: Number(item.quantity || 0),
      unit_price: orderType === "return" ? 0 : Number(item.unit_price ?? item.price ?? 0)
    }));

    if (normalizedItems.some((item) => !item.product_id || item.quantity <= 0 || item.unit_price < 0)) {
      return res.status(400).json({ error: "Each item requires product_id, quantity, and unit_price" });
    }

    const computedTotal = normalizedItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const requestedTotal = Number(total_amount);
    const orderTotal = Number.isFinite(requestedTotal) && requestedTotal > 0 ? requestedTotal : computedTotal;
    const orderPayload = {
      user_id,
      address_id: address_id || null,
      total_amount: orderTotal,
      delivery_date,
      status: "Placed",
      order_type: orderType
    };
    let { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();
    if (orderError?.message?.includes("order_type")) {
      const { order_type, ...fallbackPayload } = orderPayload;
      const fallback = await supabase.from("orders").insert(fallbackPayload).select().single();
      order = fallback.data;
      orderError = fallback.error;
    }
    if (orderError) throw orderError;

    const orderItems = normalizedItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
    if (itemsError) throw itemsError;

    for (const item of normalizedItems) {
      if (orderType === "return") continue;
      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("id, quantity_available")
        .eq("product_id", item.product_id)
        .maybeSingle();
      if (inventoryError) throw inventoryError;
      if (inventory) {
        const nextQuantity = Math.max(Number(inventory.quantity_available) - item.quantity, 0);
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ quantity_available: nextQuantity, last_updated: new Date().toISOString() })
          .eq("id", inventory.id);
        if (updateError) throw updateError;
      }
    }

    if (payment_id) {
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ order_id: order.id })
        .eq("id", payment_id)
        .eq("user_id", user_id);
      if (paymentError) throw paymentError;
    }

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

import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();
const JAR_DEPOSIT = 250;
const WATER_CHARGE = 40;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.post("/", async (req, res, next) => {
  try {
    const { user_id, product_id, address_id, frequency, start_date, quantity, jar_count, status } = req.body;
    if (!user_id || !product_id) {
      return res.status(400).json({ error: "user_id and product_id are required" });
    }

    const supabase = requireSupabase();
    const jars = Math.max(1, Number(jar_count ?? quantity ?? 1));
    const jarDeposit = jars * JAR_DEPOSIT;
    const waterCharge = jars * WATER_CHARGE;
    const subscriptionFrequency = frequency || "Custom";
    const subscriptionStartDate = start_date || new Date().toISOString().slice(0, 10);

    let resolvedAddressId = address_id || null;
    if (!resolvedAddressId) {
      if (UUID_PATTERN.test(user_id)) {
        const { data: defaultAddress, error: addressError } = await supabase
          .from("addresses")
          .select("id")
          .eq("user_id", user_id)
          .eq("is_default", true)
          .maybeSingle();
        if (addressError) throw addressError;
        resolvedAddressId = defaultAddress?.id || null;
      }
    }

    if (!UUID_PATTERN.test(user_id)) {
      return res.status(201).json({
        id: "mock-subscription",
        user_id,
        product_id,
        address_id: resolvedAddressId,
        frequency: subscriptionFrequency,
        start_date: subscriptionStartDate,
        status: status || "Pending",
        quantity: jars,
        jar_count: jars,
        jar_deposit: jarDeposit,
        water_charge_per_delivery: waterCharge,
        deposit_refunded: false,
        mode: "mock",
        message: "Mock subscription created because user_id is not a valid UUID"
      });
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .insert({
        user_id,
        product_id,
        address_id: resolvedAddressId,
        frequency: subscriptionFrequency,
        start_date: subscriptionStartDate,
        quantity: jars,
        jar_count: jars,
        jar_deposit: jarDeposit,
        water_charge_per_delivery: waterCharge,
        deposit_refunded: false,
        status: status || "Pending"
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    let query = requireSupabase()
      .from("subscriptions")
      .select("*, users(phone,name,wallet_balance), products(*), addresses(*)")
      .order("start_date", { ascending: false });
    if (req.query.status) {
      query = query.eq("status", req.query.status);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/:userId", async (req, res, next) => {
  try {
    let query = requireSupabase()
      .from("subscriptions")
      .select("*, products(*), addresses(*)")
      .eq("user_id", req.params.userId)
      .order("start_date");
    if (req.query.status) {
      query = query.eq("status", req.query.status);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const allowed = ["frequency", "start_date", "status", "quantity", "address_id", "jar_count"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));

    if (updates.jar_count !== undefined) {
      const jars = Math.max(1, Number(updates.jar_count));
      updates.jar_count = jars;
      updates.quantity = jars;
      updates.jar_deposit = jars * JAR_DEPOSIT;
      updates.water_charge_per_delivery = jars * WATER_CHARGE;
    }

    if (["Cancellation Requested", "Return Pending", "Picked Up", "Returned", "Refund Completed", "Cancelled"].includes(updates.status)) {
      return res.status(400).json({ error: "Return statuses are managed through the return request flow" });
    }

    const { data, error } = await supabase
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

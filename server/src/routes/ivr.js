import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { validateRefillItems } from "./orders.js";

const router = Router();
const PRODUCT_ID_20L = "20l-ro-jar";
const REFILL_PRICE = 40;

function normalizePhone(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 13 && digits.startsWith("091")) return `+${digits.slice(1)}`;
  if (String(rawPhone).trim().startsWith("+91") && digits.length === 12) return `+${digits}`;
  return null;
}

function ivrError(res, status, code, message) {
  return res.status(status).json({ ok: false, code, error: message });
}

function readPayload(body) {
  const callerPhone = body.callerPhone || body.caller || body.from || body.phone;
  const quantity = body.quantity ?? body.digits ?? body.Digits;
  const callId = body.callId || body.CallSid || body.call_id || null;
  return { callerPhone, quantity, callId };
}

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ivr-ordering" });
});

router.post("/order", async (req, res, next) => {
  try {
    const { callerPhone, quantity, callId } = readPayload(req.body || {});
    const normalizedPhone = normalizePhone(callerPhone);
    const refillQuantity = Number(quantity);

    if (!callerPhone || !normalizedPhone) {
      return ivrError(res, 400, "CALLER_PHONE_REQUIRED", "callerPhone is required and must be an Indian mobile number");
    }
    if (quantity === undefined || quantity === null || quantity === "") {
      return ivrError(res, 400, "QUANTITY_REQUIRED", "quantity is required");
    }
    if (!Number.isInteger(refillQuantity) || refillQuantity < 1 || refillQuantity > 5) {
      return ivrError(res, 400, "INVALID_QUANTITY", "quantity must be between 1 and 5");
    }

    const supabase = requireSupabase();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id,phone,name")
      .eq("phone", normalizedPhone)
      .maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return ivrError(res, 404, "USER_NOT_FOUND", "No customer found for this caller phone");
    }

    const { data: address, error: addressError } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle();
    if (addressError) throw addressError;
    if (!address) {
      return ivrError(res, 400, "DEFAULT_ADDRESS_REQUIRED", "Customer must have a default delivery address");
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("id,user_id,product_id,jar_count,quantity,status")
      .eq("user_id", user.id)
      .eq("product_id", PRODUCT_ID_20L)
      .eq("status", "Active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;
    if (!subscription) {
      return ivrError(res, 400, "ACTIVE_SUBSCRIPTION_REQUIRED", "Customer needs an active 20L jar subscription for refill orders");
    }

    const items = validateRefillItems({
      subscription,
      userId: user.id,
      items: [{ product_id: PRODUCT_ID_20L, quantity: refillQuantity, unit_price: REFILL_PRICE }]
    });
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        address_id: address.id,
        status: "Placed",
        type: "refill",
        subscription_id: subscription.id,
        total_amount: totalAmount,
        source: "ivr",
        payment_method: "cash_on_delivery",
        payment_status: "pending",
        caller_phone: normalizedPhone,
        ivr_call_id: callId || null
      })
      .select()
      .single();
    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    );
    if (itemsError) throw itemsError;

    res.status(201).json({
      ok: true,
      message: "IVR refill order created",
      order: {
        id: order.id,
        type: "refill",
        status: order.status,
        source: order.source,
        quantity: refillQuantity,
        total_amount: Number(order.total_amount),
        payment_method: order.payment_method,
        payment_status: order.payment_status
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import crypto from "crypto";
import { Router } from "express";
import Razorpay from "razorpay";
import { requireSupabase } from "../config/supabase.js";
import { formatPaginatedResponse, getPagination } from "../utils/pagination.js";

const router = Router();

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
const razorpay =
  razorpayKeyId && razorpayKeySecret
    ? new Razorpay({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret
      })
    : null;

function requireRazorpay() {
  if (!razorpay || !razorpayKeyId || !razorpayKeySecret) {
    const error = new Error("Razorpay is not configured");
    error.status = 503;
    throw error;
  }
  return razorpay;
}

router.get("/due/:userId", async (req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("orders")
      .select("id,total_amount,payments(amount,status)")
      .eq("user_id", req.params.userId);
    if (error) throw error;

    const due = data.reduce((sum, order) => {
      const paid = (order.payments || [])
        .filter((payment) => payment.status === "Paid")
        .reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);
      return sum + Math.max(Number(order.total_amount) - paid, 0);
    }, 0);

    res.json({ user_id: req.params.userId, due_amount: due });
  } catch (error) {
    next(error);
  }
});

router.get("/:userId", async (req, res, next) => {
  try {
    const pagination = getPagination(req);
    let query = requireSupabase()
      .from("payments")
      .select("*", pagination ? { count: "exact" } : undefined)
      .eq("user_id", req.params.userId)
      .order("created_at", { ascending: false });
    if (pagination) {
      query = query.range(pagination.from, pagination.to);
    }
    const { data, error, count } = await query;
    if (error) throw error;
    res.json(pagination ? formatPaginatedResponse(data, count, pagination) : data);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { user_id, order_id, amount, method, status = "Paid" } = req.body;
    if (!user_id || !amount || !method) {
      return res.status(400).json({ error: "user_id, amount, and method are required" });
    }
    const { data, error } = await requireSupabase()
      .from("payments")
      .insert({ user_id, order_id, amount, method, status })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.post("/create-order", async (req, res, next) => {
  try {
    const { amount, currency = "INR", receipt, user_id, order_id, pay_due = false } = req.body;
    const amountInPaise = Number(amount);
    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({ error: "amount in paise is required" });
    }

    const razorpayOrder = await requireRazorpay().orders.create({
      amount: Math.round(amountInPaise),
      currency,
      receipt: receipt || `receipt_${Date.now()}`
    });

    let payments = [];
    if (user_id) {
      const supabase = requireSupabase();
      let paymentRows = [
        {
          user_id,
          order_id: order_id || null,
          amount: Number((amountInPaise / 100).toFixed(2)),
          method: `Razorpay:${razorpayOrder.id}`,
          status: "Pending"
        }
      ];

      if (pay_due) {
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("id,total_amount,payments(amount,status)")
          .eq("user_id", user_id)
          .order("created_at", { ascending: true });
        if (ordersError) throw ordersError;

        paymentRows = (orders || [])
          .map((order) => {
            const paid = (order.payments || [])
              .filter((payment) => payment.status === "Paid")
              .reduce((paymentSum, payment) => paymentSum + Number(payment.amount), 0);
            const outstanding = Number(order.total_amount) - paid;
            return outstanding > 0
              ? {
                  user_id,
                  order_id: order.id,
                  amount: Number(outstanding.toFixed(2)),
                  method: `Razorpay:${razorpayOrder.id}`,
                  status: "Pending"
                }
              : null;
          })
          .filter(Boolean);
      }

      if (paymentRows.length) {
        const { data, error } = await supabase
          .from("payments")
          .insert(paymentRows)
          .select()
          .throwOnError();
        if (error) throw error;
        payments = data || [];
      }
    }

    res.status(201).json({
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: razorpayKeyId,
      payment: payments[0] || null,
      payments
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required" });
    }

    if (!razorpayKeySecret) {
      return res.status(503).json({ error: "Razorpay is not configured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      const { error } = await requireSupabase()
        .from("payments")
        .update({ status: "Failed" })
        .eq("method", `Razorpay:${razorpay_order_id}`);
      if (error) throw error;
      return res.status(400).json({ error: "Invalid Razorpay signature" });
    }

    const supabase = requireSupabase();
    let { data, error } = await supabase
      .from("payments")
      .update({ status: "Paid", method: "Order Payment", description: "Order Payment" })
      .eq("method", `Razorpay:${razorpay_order_id}`)
      .select()
    if (error?.message?.includes("description")) {
      const retry = await supabase
        .from("payments")
        .update({ status: "Paid", method: "Order Payment" })
        .eq("method", `Razorpay:${razorpay_order_id}`)
        .select();
      data = retry.data;
      error = retry.error;
    }
    if (error) throw error;

    res.json({ success: true, payment: data?.[0] || null, payments: data || [] });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";
import { requireAdmin } from "../middleware/admin.js";
import { ensureTestUser, TEST_ADDRESS_ID, TEST_USER_ID } from "./auth.js";
import { assertValidStatusTransition } from "../utils/orderStatuses.js";

const router = Router();
const JAR_DEPOSIT = 250;
const DEV_CONFIRM_PHRASE = "DELETE TEST DATA";
const SEED_CONFIRM_PHRASE = "SEED DEMO DATA";
const TEST_PHONE = "+919999999999";
const DEMO_PRODUCTS = [
  {
    id: "20l-ro-jar",
    name: "20L RO Purified Jar",
    description: "Family pack purified RO water jar with sealed cap.",
    image_url: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?q=80&w=900&auto=format&fit=crop",
    price: 80,
    unit: "20L Jar",
    is_active: true,
    stock: 350
  },
  {
    id: "10l-ro-jar",
    name: "10L RO Purified Jar",
    description: "Compact jar for smaller homes and offices.",
    image_url: "https://images.unsplash.com/photo-1606168094336-48f205e1fc27?q=80&w=900&auto=format&fit=crop",
    price: 55,
    unit: "10L Jar",
    is_active: true,
    stock: 160
  },
  {
    id: "1l-bottle-pack",
    name: "1L Bottle Pack",
    description: "Pack of 12 mineral-balanced RO bottles.",
    image_url: "https://images.unsplash.com/photo-1523362628745-0c100150b504?q=80&w=900&auto=format&fit=crop",
    price: 180,
    unit: "12 x 1L",
    is_active: true,
    stock: 90
  },
  {
    id: "jar-stand",
    name: "Jar Stand",
    description: "Durable stand for 20L water jars.",
    image_url: "https://images.unsplash.com/photo-1559839914-17aae19cec71?q=80&w=900&auto=format&fit=crop",
    price: 249,
    unit: "Piece",
    is_active: true,
    stock: 40
  }
];
const DEMO_DELIVERY_BOYS = [
  { name: "Ramesh Delivery", phone: "+919888888888", is_active: true },
  { name: "Suresh Delivery", phone: "+919777777777", is_active: true }
];
const LOW_STOCK_THRESHOLD = 50;

router.use(requireAdmin);

function devToolsEnabled() {
  return process.env.ADMIN_DEV_TOOLS_ENABLED === "true";
}

function indiaDayRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value;
  const year = Number(getPart("year"));
  const month = Number(getPart("month"));
  const day = Number(getPart("day"));
  const start = new Date(Date.UTC(year, month - 1, day, -5, -30, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function countByStatus(items, status) {
  return items.filter((item) => item.status === status).length;
}

function sumAmounts(items, field = "amount") {
  return items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
}

async function deleteRows(query) {
  const { data, error } = await query.select("id");
  if (error) throw error;
  return data?.length || 0;
}

async function ensureCleanupUser(supabase, phone) {
  if (phone === TEST_PHONE) {
    await ensureTestUser();
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id,phone")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw error;
  return user;
}

async function ensureSingleDefaultAddress(supabase, userId, phone) {
  if (phone === TEST_PHONE && userId === TEST_USER_ID) {
    const { error: upsertError } = await supabase.from("addresses").upsert(
      {
        id: TEST_ADDRESS_ID,
        user_id: TEST_USER_ID,
        label: "Home",
        full_address: "Test address, local development",
        lat: 19.076,
        lng: 72.8777,
        is_default: true
      },
      { onConflict: "id" }
    );
    if (upsertError) throw upsertError;

    const deleted = await deleteRows(
      supabase.from("addresses").delete().eq("user_id", userId).neq("id", TEST_ADDRESS_ID)
    );
    return deleted;
  }

  const { data: existingAddress, error: lookupError } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existingAddress) {
    const { error: defaultError } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", existingAddress.id);
    if (defaultError) throw defaultError;

    return deleteRows(
      supabase.from("addresses").delete().eq("user_id", userId).neq("id", existingAddress.id)
    );
  }

  const { error: insertError } = await supabase.from("addresses").insert({
    user_id: userId,
    label: "Home",
    full_address: "Test address, local development",
    lat: 19.076,
    lng: 72.8777,
    is_default: true
  });
  if (insertError) throw insertError;
  return 0;
}

router.get("/dev/status", (_req, res) => {
  res.json({ enabled: devToolsEnabled() });
});

router.get("/dashboard-summary", async (_req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { start, end } = indiaDayRange();
    const [
      ordersResult,
      todayOrdersResult,
      todayDeliveredResult,
      subscriptionsResult,
      deliveryBoysResult,
      inventoryResult,
      paymentsTodayResult,
      transactionsTodayResult
    ] = await Promise.all([
      supabase.from("orders").select("id,status,total_amount,delivery_boy_id,payments(amount,status)"),
      supabase.from("orders").select("id,status,total_amount,created_at").gte("created_at", start).lt("created_at", end),
      supabase.from("orders").select("id,status,delivered_at,created_at").or(`and(delivered_at.gte.${start},delivered_at.lt.${end}),and(delivered_at.is.null,status.eq.Delivered,created_at.gte.${start},created_at.lt.${end})`),
      supabase.from("subscriptions").select("id,status"),
      supabase.from("delivery_boys").select("id,is_active"),
      supabase.from("inventory").select("product_id,quantity_available,products(name,unit)").order("quantity_available", { ascending: true }),
      supabase.from("payments").select("id,amount,status,created_at").gte("created_at", start).lt("created_at", end),
      supabase.from("transactions").select("id,type,amount,created_at").gte("created_at", start).lt("created_at", end)
    ]);

    for (const result of [
      ordersResult,
      todayOrdersResult,
      todayDeliveredResult,
      subscriptionsResult,
      deliveryBoysResult,
      inventoryResult,
      paymentsTodayResult,
      transactionsTodayResult
    ]) {
      if (result.error) throw result.error;
    }

    const orders = ordersResult.data || [];
    const todayOrders = todayOrdersResult.data || [];
    const subscriptions = subscriptionsResult.data || [];
    const deliveryBoys = deliveryBoysResult.data || [];
    const inventory = inventoryResult.data || [];
    const paymentsToday = paymentsTodayResult.data || [];
    const transactionsToday = transactionsTodayResult.data || [];
    const lowStockItems = inventory
      .filter((item) => Number(item.quantity_available) < LOW_STOCK_THRESHOLD)
      .map((item) => ({
        product_id: item.product_id,
        name: item.products?.name || item.product_id,
        quantity_available: Number(item.quantity_available || 0),
        unit: item.products?.unit || null
      }));
    const pendingDue = orders.reduce((sum, order) => {
      const paid = (order.payments || [])
        .filter((payment) => payment.status === "Paid")
        .reduce((paymentSum, payment) => paymentSum + Number(payment.amount || 0), 0);
      return sum + Math.max(Number(order.total_amount || 0) - paid, 0);
    }, 0);
    const paidToday = paymentsToday.filter((payment) => payment.status === "Paid");
    const walletRefundsToday = transactionsToday.filter((transaction) => transaction.type?.startsWith("refund"));

    res.json({
      today: {
        orders: todayOrders.length,
        delivered: todayDeliveredResult.data?.length || 0,
        pending: todayOrders.filter((order) => !["Delivered", "Cancelled", "Refund Completed"].includes(order.status)).length,
        revenue: Number(sumAmounts(paidToday).toFixed(2)),
        refunds: Number(sumAmounts(walletRefundsToday).toFixed(2))
      },
      orders: {
        placed: countByStatus(orders, "Placed"),
        confirmed: countByStatus(orders, "Confirmed"),
        assigned: countByStatus(orders, "Assigned"),
        pickedUp: countByStatus(orders, "Picked Up"),
        delivered: countByStatus(orders, "Delivered"),
        cancelled: countByStatus(orders, "Cancelled")
      },
      subscriptions: {
        active: countByStatus(subscriptions, "Active"),
        paused: countByStatus(subscriptions, "Paused"),
        cancellationRequested: countByStatus(subscriptions, "Cancellation Requested"),
        returnPending: countByStatus(subscriptions, "Return Pending")
      },
      delivery: {
        activeDeliveryBoys: deliveryBoys.filter((boy) => boy.is_active).length,
        assignedOrders: countByStatus(orders, "Assigned"),
        unassignedConfirmedOrders: orders.filter((order) => order.status === "Confirmed" && !order.delivery_boy_id).length
      },
      inventory: {
        lowStockCount: lowStockItems.length,
        lowStockItems
      },
      payments: {
        paidToday: Number(sumAmounts(paidToday).toFixed(2)),
        pendingDue: Number(pendingDue.toFixed(2)),
        walletRefundsToday: Number(sumAmounts(walletRefundsToday).toFixed(2))
      },
      meta: {
        timezone: "Asia/Kolkata",
        dayStart: start,
        dayEnd: end
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/dev/cleanup-test-data", async (req, res, next) => {
  try {
    if (!devToolsEnabled()) {
      return res.status(403).json({ error: "Admin dev tools are disabled" });
    }

    const phone = req.body.phone?.trim();
    if (!phone) return res.status(400).json({ error: "phone is required" });
    if (req.body.confirm !== DEV_CONFIRM_PHRASE) {
      return res.status(400).json({ error: `confirm must be exactly: ${DEV_CONFIRM_PHRASE}` });
    }

    const supabase = requireSupabase();
    const user = await ensureCleanupUser(supabase, phone);
    if (!user) return res.status(404).json({ error: "No user found with that phone" });

    const { data: orders, error: orderLookupError } = await supabase
      .from("orders")
      .select("id")
      .eq("user_id", user.id);
    if (orderLookupError) throw orderLookupError;
    const orderIds = (orders || []).map((order) => order.id);

    let ordersDeleted = 0;
    if (orderIds.length) {
      await deleteRows(supabase.from("order_assignments").delete().in("order_id", orderIds));
      await deleteRows(supabase.from("order_items").delete().in("order_id", orderIds));
    }

    const paymentsDeleted = await deleteRows(supabase.from("payments").delete().eq("user_id", user.id));
    const transactionsDeleted = await deleteRows(supabase.from("transactions").delete().eq("user_id", user.id));

    if (orderIds.length) {
      ordersDeleted = await deleteRows(supabase.from("orders").delete().in("id", orderIds).eq("user_id", user.id));
    }

    const subscriptionsDeleted = await deleteRows(supabase.from("subscriptions").delete().eq("user_id", user.id));
    const addressesDeleted = await ensureSingleDefaultAddress(supabase, user.id, phone);

    const { error: walletError } = await supabase
      .from("users")
      .update({ wallet_balance: 0 })
      .eq("id", user.id)
      .eq("phone", phone);
    if (walletError) throw walletError;

    res.json({
      ordersDeleted,
      subscriptionsDeleted,
      paymentsDeleted,
      transactionsDeleted,
      addressesDeleted,
      walletReset: true
    });
  } catch (error) {
    next(error);
  }
});

router.post("/dev/seed-demo-data", async (req, res, next) => {
  try {
    if (!devToolsEnabled()) {
      return res.status(403).json({ error: "Admin dev tools are disabled" });
    }
    if (req.body.confirm !== SEED_CONFIRM_PHRASE) {
      return res.status(400).json({ error: `confirm must be exactly: ${SEED_CONFIRM_PHRASE}` });
    }

    const supabase = requireSupabase();
    await ensureTestUser();

    const { error: userError } = await supabase
      .from("users")
      .update({ phone: TEST_PHONE, name: "Test Customer", wallet_balance: 0 })
      .eq("id", TEST_USER_ID);
    if (userError) throw userError;

    const { error: addressError } = await supabase.from("addresses").upsert(
      {
        id: TEST_ADDRESS_ID,
        user_id: TEST_USER_ID,
        label: "Home",
        full_address: "Demo Home Address, TOP-R Test Area",
        lat: 19.076,
        lng: 72.8777,
        is_default: true
      },
      { onConflict: "id" }
    );
    if (addressError) throw addressError;

    const { error: clearAddressError } = await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", TEST_USER_ID)
      .neq("id", TEST_ADDRESS_ID);
    if (clearAddressError) throw clearAddressError;

    const { data: deliveryBoys, error: deliveryBoysError } = await supabase
      .from("delivery_boys")
      .upsert(DEMO_DELIVERY_BOYS, { onConflict: "phone" })
      .select("id");
    if (deliveryBoysError) throw deliveryBoysError;

    const productRows = DEMO_PRODUCTS.map(({ stock, ...product }) => product);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .upsert(productRows, { onConflict: "id" })
      .select("id");
    if (productsError) throw productsError;

    const now = new Date().toISOString();
    const inventoryRows = DEMO_PRODUCTS.map((product) => ({
      product_id: product.id,
      quantity_available: product.stock,
      last_updated: now
    }));
    const { error: inventoryError } = await supabase
      .from("inventory")
      .upsert(inventoryRows, { onConflict: "product_id" });
    if (inventoryError) throw inventoryError;

    res.json({
      userReady: true,
      defaultAddressReady: true,
      deliveryBoysReady: deliveryBoys?.length || DEMO_DELIVERY_BOYS.length,
      productsReady: products?.length || DEMO_PRODUCTS.length,
      inventoryReady: true
    });
  } catch (error) {
    next(error);
  }
});

router.get("/delivery-boys", async (_req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("delivery_boys")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name");
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    next(error);
  }
});

router.post("/delivery-boys", async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const phone = req.body.phone?.trim();
    if (!name || !phone) return res.status(400).json({ error: "name and phone are required" });
    const { data, error } = await requireSupabase()
      .from("delivery_boys")
      .insert({ name, phone, is_active: req.body.is_active !== false })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.patch("/delivery-boys/:id", async (req, res, next) => {
  try {
    const updates = Object.fromEntries(
      Object.entries({ name: req.body.name?.trim(), phone: req.body.phone?.trim(), is_active: req.body.is_active })
        .filter(([, value]) => value !== undefined && value !== "")
    );
    if (!Object.keys(updates).length) return res.status(400).json({ error: "No delivery boy fields to update" });
    const { data, error } = await requireSupabase()
      .from("delivery_boys")
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

router.delete("/delivery-boys/:id", async (req, res, next) => {
  try {
    const { error } = await requireSupabase().from("delivery_boys").delete().eq("id", req.params.id);
    if (error) {
      error.status = error.code === "23503" ? 409 : undefined;
      if (error.code === "23503") error.message = "Cannot remove a delivery boy with assignment history. Deactivate them instead.";
      throw error;
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/orders/:id/assign", async (req, res, next) => {
  try {
    const { delivery_boy_id, notes } = req.body;
    if (!delivery_boy_id) return res.status(400).json({ error: "delivery_boy_id is required" });

    const supabase = requireSupabase();
    const { data: deliveryBoy, error: deliveryBoyError } = await supabase
      .from("delivery_boys")
      .select("id,name,phone,is_active")
      .eq("id", delivery_boy_id)
      .single();
    if (deliveryBoyError) throw deliveryBoyError;
    if (!deliveryBoy.is_active) return res.status(400).json({ error: "Delivery boy is inactive" });

    const { data: existingOrder, error: orderError } = await supabase
      .from("orders")
      .select("id,status,type")
      .eq("id", req.params.id)
      .single();
    if (orderError) throw orderError;
    const orderType = existingOrder.type || "regular";
    assertValidStatusTransition(existingOrder.status, "Assigned", orderType);

    const assignedAt = new Date().toISOString();
    const { data: order, error: updateError } = await supabase
      .from("orders")
      .update({ delivery_boy_id, assigned_at: assignedAt, status: "Assigned" })
      .eq("id", existingOrder.id)
      .eq("status", existingOrder.status)
      .select("*, users(phone,name), addresses(*), delivery_boys(id,name,phone), order_items(*, products(*))")
      .single();
    if (updateError) throw updateError;

    const { error: assignmentError } = await supabase
      .from("order_assignments")
      .insert({ order_id: order.id, delivery_boy_id, assigned_at: assignedAt, status: "Assigned", notes: notes || null });
    if (assignmentError) throw assignmentError;

    res.status(201).json({ order, delivery_boy: deliveryBoy });
  } catch (error) {
    next(error);
  }
});

async function findReturnSubscription(supabase, order) {
  if (order.subscription_id) {
    const { data, error } = await supabase.from("subscriptions").select("*").eq("id", order.subscription_id).single();
    if (error) throw error;
    return data;
  }

  const firstItem = order.order_items?.[0];
  let query = supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", order.user_id)
    .eq("deposit_refunded", false)
    .neq("status", "Cancelled");
  if (firstItem?.product_id) query = query.eq("product_id", firstItem.product_id);
  const { data, error } = await query.order("start_date", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export function getReturnTransitionEffects(subscription, returnOrder, targetStatus) {
  if (targetStatus === "Confirmed") {
    return { subscriptionUpdates: { status: "Return Pending", return_status: "Return Pending" }, refundAmount: 0, transaction: null, walletCredit: false };
  }
  if (targetStatus === "Picked Up") {
    return { subscriptionUpdates: { status: "Picked Up", return_status: "Picked Up" }, refundAmount: 0, transaction: null, walletCredit: false };
  }
  if (targetStatus === "Returned") {
    return { subscriptionUpdates: { status: "Returned", return_status: "Returned" }, refundAmount: 0, transaction: null, walletCredit: false };
  }
  if (targetStatus === "Refund Completed") {
    const jars = Number(subscription.jar_count || subscription.quantity || returnOrder.order_items?.[0]?.quantity || 1);
    const refundAmount = subscription.deposit_refunded ? 0 : jars * JAR_DEPOSIT;
    return {
      subscriptionUpdates: { status: "Refund Completed", return_status: "Refund Completed", deposit_refunded: true },
      refundAmount,
      transaction: refundAmount
        ? {
            user_id: subscription.user_id,
            type: "refund_wallet",
            amount: refundAmount,
            description: `Refund completed to wallet for ${jars} returned jar(s)`
          }
        : null,
      walletCredit: refundAmount > 0
    };
  }
  if (targetStatus === "Cancelled") {
    const wasRejected = returnOrder.status === "Placed";
    return {
      subscriptionUpdates: wasRejected
        ? { status: "Active", return_status: null, cancel_requested_at: null }
        : { status: "Cancelled", return_status: "Cancelled" },
      refundAmount: 0,
      transaction: null,
      walletCredit: false
    };
  }
  return { subscriptionUpdates: null, refundAmount: 0, transaction: null, walletCredit: false };
}

router.post("/approve-return", async (req, res, next) => {
  try {
    const { order_id, target_status = "Confirmed" } = req.body;
    if (!order_id) return res.status(400).json({ error: "order_id is required" });

    const supabase = requireSupabase();
    const { data: returnOrder, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();
    if (orderError) throw orderError;
    if ((returnOrder.order_type || returnOrder.type) !== "return") {
      return res.status(400).json({ error: "This action is only available for return requests" });
    }

    const subscription = await findReturnSubscription(supabase, returnOrder);
    if (!subscription) return res.status(404).json({ error: "Subscription not found for this return request" });

    assertValidStatusTransition(returnOrder.status, target_status, "return");

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from("orders")
      .update({ status: target_status })
      .eq("id", returnOrder.id)
      .eq("status", returnOrder.status)
      .select("*, order_items(*)")
      .single();
    if (updateOrderError) throw updateOrderError;

    const { subscriptionUpdates, refundAmount, transaction, walletCredit } = getReturnTransitionEffects(subscription, returnOrder, target_status);

    let updatedSubscription = subscription;
    if (subscriptionUpdates) {
      const { data, error } = await supabase
        .from("subscriptions")
        .update(subscriptionUpdates)
        .eq("id", subscription.id)
        .select("*, users(phone,name), products(*)")
        .single();
      if (error) throw error;
      updatedSubscription = data;
    }

    if (transaction) {
      if (walletCredit) {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("wallet_balance")
          .eq("id", subscription.user_id)
          .single();
        if (userError) throw userError;
        const { error: walletError } = await supabase
          .from("users")
          .update({ wallet_balance: Number(user.wallet_balance || 0) + refundAmount })
          .eq("id", subscription.user_id);
        if (walletError) throw walletError;
      }
      const { error: transactionError } = await supabase.from("transactions").insert(transaction);
      if (transactionError) throw transactionError;
    }

    res.json({
      success: true,
      order: updatedOrder,
      subscription: updatedSubscription,
      refund_amount: refundAmount,
      refund_method: target_status === "Refund Completed" ? "Wallet" : null
    });
  } catch (error) {
    next(error);
  }
});

export default router;

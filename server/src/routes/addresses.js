import { Router } from "express";
import { requireSupabase } from "../config/supabase.js";

const router = Router();
const ADDRESS_FIELDS = ["label", "full_address", "landmark", "area", "city", "pincode", "lat", "lng", "is_default"];

function addressPayload(body) {
  return Object.fromEntries(
    ADDRESS_FIELDS
      .map((key) => [key, body[key]])
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
  );
}

async function clearDefaultAddress(supabase, userId) {
  const { error } = await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId);
  if (error) throw error;
}

async function setAddressDefault(supabase, addressId) {
  const { data: address, error: lookupError } = await supabase
    .from("addresses")
    .select("id,user_id")
    .eq("id", addressId)
    .single();
  if (lookupError) throw lookupError;

  await clearDefaultAddress(supabase, address.user_id);
  const { data, error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", address.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function promoteFallbackDefault(supabase, userId) {
  const { data: nextAddress, error: lookupError } = await supabase
    .from("addresses")
    .select("id")
    .eq("user_id", userId)
    .order("label", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!nextAddress) return null;
  return setAddressDefault(supabase, nextAddress.id);
}

router.get("/:userId", async (req, res, next) => {
  try {
    const { data, error } = await requireSupabase()
      .from("addresses")
      .select("*")
      .eq("user_id", req.params.userId)
      .order("is_default", { ascending: false })
      .order("label", { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { user_id } = req.body;
    const payload = addressPayload(req.body);
    if (!user_id || !payload.label || !payload.full_address) {
      return res.status(400).json({ error: "user_id, label, and full_address are required" });
    }

    const supabase = requireSupabase();
    if (payload.is_default) await clearDefaultAddress(supabase, user_id);

    const { data, error } = await supabase
      .from("addresses")
      .insert({ ...payload, user_id })
      .select()
      .single();
    if (error) throw error;

    if (!payload.is_default) {
      const { count, error: countError } = await supabase
        .from("addresses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("is_default", true);
      if (countError) throw countError;
      if (!count) await setAddressDefault(supabase, data.id);
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/default", async (req, res, next) => {
  try {
    res.json(await setAddressDefault(requireSupabase(), req.params.id));
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const updates = addressPayload(req.body);
    if (updates.full_address !== undefined && !updates.full_address) {
      return res.status(400).json({ error: "full_address is required" });
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ error: "No address fields to update" });
    }

    if (updates.is_default === true) {
      const address = await setAddressDefault(supabase, req.params.id);
      const { is_default, ...remainingUpdates } = updates;
      if (!Object.keys(remainingUpdates).length) return res.json(address);
      const { data, error } = await supabase
        .from("addresses")
        .update(remainingUpdates)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      return res.json(data);
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
    const supabase = requireSupabase();
    const { data: address, error: lookupError } = await supabase
      .from("addresses")
      .select("user_id,is_default")
      .eq("id", req.params.id)
      .single();
    if (lookupError) throw lookupError;

    const { error } = await supabase.from("addresses").delete().eq("id", req.params.id);
    if (error) throw error;

    if (address.is_default) await promoteFallbackDefault(supabase, address.user_id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;

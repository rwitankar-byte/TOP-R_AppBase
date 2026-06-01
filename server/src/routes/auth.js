import { Router } from "express";
import { supabaseAdmin, supabaseAuth } from "../config/supabase.js";

const router = Router();

router.post("/send-otp", async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone is required" });
    if (!supabaseAuth) return res.json({ message: "OTP mocked because Supabase is not configured" });

    const { data, error } = await supabaseAuth.auth.signInWithOtp({ phone });
    if (error) throw error;
    res.json({ message: "OTP sent", data });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const { phone, token } = req.body;
    if (!phone || !token) return res.status(400).json({ error: "phone and token are required" });
    if (!supabaseAuth) return res.json({ message: "OTP verified in mock mode", user: { phone } });

    const { data, error } = await supabaseAuth.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) throw error;

    if (data.user && supabaseAdmin) {
      const userProfile = { id: data.user.id, phone: data.user.phone || phone };
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("users")
        .upsert(userProfile, { onConflict: "id" })
        .select()
        .single();
      if (profileError) throw profileError;

      const { data: existingAddress, error: addressLookupError } = await supabaseAdmin
        .from("addresses")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("is_default", true)
        .maybeSingle();
      if (addressLookupError) throw addressLookupError;

      if (!existingAddress) {
        const { error: addressError } = await supabaseAdmin.from("addresses").insert({
          user_id: data.user.id,
          label: "Home",
          full_address: "Default delivery address",
          is_default: true
        });
        if (addressError) throw addressError;
      }

      return res.json({ ...data, profile });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;

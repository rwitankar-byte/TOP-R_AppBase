import { Expo } from "expo-server-sdk";
import { requireSupabase } from "../config/supabase.js";

const expo = new Expo();

export function shortOrderId(orderId) {
  return String(orderId || "").slice(0, 8);
}

export async function sendPushNotification(userId, title, body, data = {}) {
  try {
    if (!userId || !title || !body) {
      console.log("Push notification skipped: missing userId, title, or body");
      return { sent: false, reason: "missing_fields" };
    }

    const { data: user, error } = await requireSupabase()
      .from("users")
      .select("push_token")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;

    if (!user?.push_token) {
      console.log(`Push notification skipped: no token for user ${userId}`);
      return { sent: false, reason: "missing_token" };
    }

    if (!Expo.isExpoPushToken(user.push_token)) {
      console.log(`Push notification skipped: invalid Expo token for user ${userId}`);
      return { sent: false, reason: "invalid_token" };
    }

    const messages = [{
      to: user.push_token,
      sound: "default",
      title,
      body,
      data: { ...data, userId }
    }];
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error("Expo push chunk failed:", error.message);
      }
    }

    console.log("Push notification queued:", JSON.stringify({ userId, title, tickets }));
    return { sent: tickets.length > 0, tickets };
  } catch (error) {
    console.error("Push notification failed:", error.message);
    return { sent: false, reason: error.message };
  }
}

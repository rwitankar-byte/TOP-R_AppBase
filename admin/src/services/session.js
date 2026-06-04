import AsyncStorage from "@react-native-async-storage/async-storage";

const ADMIN_SESSION_KEY = "topr_admin_session";

export async function saveAdminSession(session) {
  await AsyncStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export async function getAdminSession() {
  const raw = await AsyncStorage.getItem(ADMIN_SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAdminSession() {
  await AsyncStorage.removeItem(ADMIN_SESSION_KEY);
}

import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "water_app_session";
const SELECTED_ADDRESS_KEY = "water_app_selected_address";
export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
export const TEST_PHONE = "+91 9999999999";

export function createMockSession() {
  return {
    testMode: true,
    user: {
      id: TEST_USER_ID,
      phone: TEST_PHONE
    },
    profile: {
      id: TEST_USER_ID,
      phone: "+919999999999",
      name: "Test User",
      wallet_balance: 500
    }
  };
}

export async function saveSession(session) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getSession() {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function getOrCreateMockSession() {
  const storedSession = await getSession();
  if (storedSession?.user?.id) return storedSession;

  const mockSession = createMockSession();
  await saveSession(mockSession);
  return mockSession;
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
  await AsyncStorage.removeItem(SELECTED_ADDRESS_KEY);
}

export async function saveSelectedAddress(address) {
  await AsyncStorage.setItem(SELECTED_ADDRESS_KEY, JSON.stringify(address));
}

export async function getSelectedAddress() {
  const raw = await AsyncStorage.getItem(SELECTED_ADDRESS_KEY);
  return raw ? JSON.parse(raw) : null;
}

import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_SUBJECT,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  SUPPORT_WHATSAPP_URL,
  SUPPORT_WHATSAPP_MESSAGE
} from "../config/support";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { api } from "../services/api";
import { clearSession, getOrCreateMockSession } from "../services/session";

const sections = [
  {
    title: "Orders",
    items: ["All Orders", "Order Calendar", "Favorite Orders", "Address Book", "Transaction History", "Return Empty Jar"]
  },
  {
    title: "Customer Support",
    items: ["Call Support", "WhatsApp Support", "Email Support", "FAQ", "Locate Us"]
  },
  {
    title: "Rewards",
    items: ["Collected Coupons"]
  },
  {
    title: "Legal",
    items: ["About Us", "Terms & Conditions", "Cancellation & Refunds Policy"]
  }
];

const routeMap = {
  "All Orders": "AllOrders",
  "Order Calendar": "OrderCalendar",
  "Favorite Orders": "FavoriteOrders",
  "Address Book": "AddressBook",
  "Transaction History": "TransactionHistory",
  "Return Empty Jar": "ReturnEmptyJar",
  FAQ: "FAQ",
  "Locate Us": "LocateUs"
};

function Row({ label, onPress }) {
  return (
    <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-gray-100" onPress={onPress}>
      <Text className="text-ink font-semibold">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProfile = () => {
    setLoading(true);
    getOrCreateMockSession().then(async (storedSession) => {
      if (storedSession?.user?.id) {
        setProfile(await api.getUser(storedSession.user.id));
      }
      setErrorMessage("");
    }).catch((error) => {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Profile", error.message);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const logout = async () => {
    await clearSession();
    navigation.replace("Auth");
  };

  const openSupportLink = async (url, fallbackMessage) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Support", fallbackMessage);
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("Support", fallbackMessage);
    }
  };

  const supportActions = {
    "Call Support": () => openSupportLink(`tel:${SUPPORT_PHONE_TEL}`, `Unable to open dialer. Please call ${SUPPORT_PHONE_DISPLAY}.`),
    "WhatsApp Support": () =>
      openSupportLink(
        `${SUPPORT_WHATSAPP_URL}?text=${encodeURIComponent(SUPPORT_WHATSAPP_MESSAGE)}`,
        `Unable to open WhatsApp. Please message or call ${SUPPORT_PHONE_DISPLAY}.`
      ),
    "Email Support": () =>
      openSupportLink(
        `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_EMAIL_SUBJECT)}`,
        `Unable to open email. Please email ${SUPPORT_EMAIL}.`
      )
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        {loading && <LoadingState message="Loading profile..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={loadProfile} /> : null}
        <View className="flex-row items-center py-5">
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
            <Ionicons name="person" size={34} color="#fff" />
          </View>
          <View className="ml-4">
            <Text className="text-ink text-xl font-extrabold">{profile?.phone || "Not logged in"}</Text>
            <Text className="text-muted">{profile?.name || "Customer account"}</Text>
          </View>
        </View>

        <Row label="View Profile Details" />
        <Row label={`Wallet (₹${Number(profile?.wallet_balance || 0)} balance)`} onPress={() => navigation.navigate("Payment")} />
        <Row label="Bank Details" />

        {sections.map((section) => (
          <View key={section.title} className="mt-5">
            <Text className="text-primary font-extrabold text-lg mb-1">{section.title}</Text>
            {section.items.map((item) => (
              <Row
                key={item}
                label={item}
                onPress={supportActions[item] || (routeMap[item] ? () => navigation.navigate(routeMap[item]) : undefined)}
              />
            ))}
          </View>
        ))}

        <TouchableOpacity className="bg-red-50 rounded-lg py-4 items-center my-8" onPress={logout}>
          <Text className="text-red-500 font-extrabold">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

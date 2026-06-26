import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { SUPPORT_ADDRESS, SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "../config/support";

export default function LocateUsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white px-4">
      <Text className="text-ink text-2xl font-extrabold my-4">Locate Us</Text>
      <View className="border border-gray-100 rounded-lg p-5">
        <View className="w-14 h-14 rounded-lg bg-primary items-center justify-center mb-4">
          <Ionicons name="location" size={28} color="#fff" />
        </View>
        <Text className="text-ink font-extrabold text-lg">TOP-R Water Plant</Text>
        <Text className="text-muted mt-2 leading-5">{SUPPORT_ADDRESS}</Text>
        <View className="bg-wash rounded-lg p-4 mt-5">
          <Text className="text-muted text-xs font-bold">Support phone</Text>
          <Text className="text-ink font-bold mt-1">{SUPPORT_PHONE_DISPLAY}</Text>
          <Text className="text-muted text-xs font-bold mt-4">Support email</Text>
          <Text className="text-ink font-bold mt-1">{SUPPORT_EMAIL}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

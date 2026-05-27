import { ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const steps = ["Placed", "Confirmed", "Out for Delivery", "Delivered"];
const currentIndex = 2;

export default function OrderTrackingScreen({ route }) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Order {route.params?.orderId || "ORD-1024"}</Text>
        <View className="border border-gray-100 rounded-lg p-4 mb-5">
          {steps.map((step, index) => {
            const done = index <= currentIndex;
            return (
              <View key={step} className="flex-row items-center mb-5 last:mb-0">
                <View className={`w-9 h-9 rounded-full items-center justify-center ${done ? "bg-primary" : "bg-gray-200"}`}>
                  <Ionicons name={done ? "checkmark" : "ellipse"} size={18} color={done ? "#fff" : "#6B7280"} />
                </View>
                <Text className={`ml-3 font-bold ${done ? "text-ink" : "text-muted"}`}>{step}</Text>
              </View>
            );
          })}
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Delivery boy details</Text>
        <View className="border border-gray-100 rounded-lg p-4">
          <Text className="text-ink font-bold">Rahul Sharma</Text>
          <Text className="text-muted mt-1">Vehicle: MH 02 AB 4521</Text>
          <Text className="text-muted mt-1">Phone: +91 90000 11111</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

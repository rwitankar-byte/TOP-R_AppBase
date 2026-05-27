import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const plans = ["Daily", "Weekly", "Custom"];
const subscriptions = [
  { id: "sub-1", product: "20L RO Purified Jar", frequency: "Weekly", quantity: 3, status: "Active" }
];

export default function SubscriptionsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Subscriptions</Text>
        <Text className="text-ink font-extrabold text-lg mb-3">Active subscriptions</Text>
        {subscriptions.map((subscription) => (
          <View key={subscription.id} className="border border-gray-100 rounded-lg p-4 mb-4">
            <View className="flex-row justify-between">
              <Text className="font-bold text-ink">{subscription.product}</Text>
              <Text className="text-primary font-bold">{subscription.status}</Text>
            </View>
            <Text className="text-muted mt-2">
              {subscription.quantity} jars • {subscription.frequency}
            </Text>
            <View className="flex-row mt-4">
              <TouchableOpacity className="bg-wash px-4 py-2 rounded-md mr-3">
                <Text className="font-bold text-ink">Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-red-50 px-4 py-2 rounded-md">
                <Text className="font-bold text-red-500">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text className="text-ink font-extrabold text-lg mb-3">Subscribe to delivery</Text>
        {plans.map((plan) => (
          <TouchableOpacity key={plan} className="border border-gray-100 rounded-lg p-4 mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="bg-primary rounded-full p-3 mr-3">
                <Ionicons name="repeat" size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-bold text-ink">{plan} delivery</Text>
                <Text className="text-muted text-xs">20L jars with flexible quantity</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#17252A" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

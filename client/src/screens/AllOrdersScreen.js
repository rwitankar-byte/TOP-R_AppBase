import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

const statusClasses = {
  Placed: "bg-blue-100 text-blue-700",
  Confirmed: "bg-orange-100 text-orange-700",
  "Out for Delivery": "bg-yellow-100 text-yellow-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700"
};

export default function AllOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateMockSession()
      .then((session) => api.getOrders(session.user.id))
      .then(setOrders)
      .catch((error) => Alert.alert("All Orders", error.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">All Orders</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && orders.length === 0 && <Text className="text-muted">No orders yet.</Text>}
        {orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            className="border border-gray-100 rounded-lg p-4 mb-3"
            onPress={() => navigation.navigate("OrderTracking", { orderId: order.id })}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-ink font-extrabold">#{order.id.slice(0, 8)}</Text>
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClasses[order.status] || "bg-gray-100 text-gray-700"}`}>
                {order.status}
              </Text>
            </View>
            <Text className="text-muted mt-2">
              {new Date(order.created_at).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </Text>
            <Text className="text-primary font-extrabold mt-2">₹{Number(order.total_amount || 0)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

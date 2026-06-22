import { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId, statusClass } from "../utils/format";

const statusActions = [
  ["Confirm", "Confirmed"],
  ["Out for Delivery", "Out for Delivery"],
  ["Delivered", "Delivered"],
  ["Cancel", "Cancelled"]
];

export default function OrderDetailScreen({ navigation, route }) {
  const [order, setOrder] = useState(route.params.order);
  const [saving, setSaving] = useState(false);
  const isRefill = order.order_type === "refill" || order.type === "refill";

  const updateStatus = async (status) => {
    setSaving(true);
    try {
      const updatedOrder = await api.updateOrderStatus(order.id, status);
      setOrder((current) => ({ ...current, ...updatedOrder }));
      Alert.alert("Order updated", `Status changed to ${status}.`);
    } catch (error) {
      Alert.alert("Order update failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Order Detail" subtitle={shortId(order.id)} onBack={navigation.goBack} />
        <View className="border border-gray-100 rounded-lg p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
            <View className="flex-row items-center">
              {isRefill && <Text className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-bold mr-2">Refill</Text>}
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(order.status)}`}>{order.status}</Text>
            </View>
          </View>
          <Text className="text-muted">Customer: {order.users?.phone || "Unknown"}</Text>
          <Text className="text-muted mt-1">Name: {order.users?.name || "Not set"}</Text>
          <Text className="text-muted mt-1">Address: {order.addresses?.full_address || "No address"}</Text>
          <Text className="text-muted mt-1">Time: {dateTime(order.created_at)}</Text>
          <Text className="text-primary text-2xl font-extrabold mt-3">{money(order.total_amount)}</Text>
          {isRefill && <Text className="text-blue-700 font-bold mt-2">Subscription refill — delivery boy picks up empty jars</Text>}
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Items</Text>
        {(order.order_items || []).map((item) => (
          <View key={item.id || item.product_id} className="border border-gray-100 rounded-lg p-4 mb-2 flex-row justify-between">
            <Text className="text-ink font-bold">{item.products?.name || item.product_id}</Text>
            <Text className="text-muted">x {item.quantity}</Text>
          </View>
        ))}

        <Text className="text-ink font-extrabold text-lg mt-4 mb-3">Update status</Text>
        {statusActions.map(([label, status]) => (
          <TouchableOpacity
            key={status}
            className={`rounded-lg py-4 items-center mb-3 ${status === "Cancelled" ? "bg-red-500" : "bg-primary"}`}
            onPress={() => updateStatus(status)}
            disabled={saving}
          >
            <Text className="text-white font-extrabold">{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

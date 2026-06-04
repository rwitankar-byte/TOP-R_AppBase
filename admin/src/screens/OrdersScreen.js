import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId, statusClass } from "../utils/format";

const filters = ["All", "Placed", "Confirmed", "Out for Delivery", "Delivered"];

function itemsText(order) {
  return (order.order_items || [])
    .map((item) => `${item.products?.name || item.product_id} x ${item.quantity}`)
    .join(", ");
}

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      setOrders(await api.getOrders(filter));
    } catch (error) {
      Alert.alert("Orders", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadOrders();
  }, [filter]));

  const filteredOrders = useMemo(() => orders, [orders]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Orders" subtitle="All customer orders" rightAction={loadOrders} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {filters.map((item) => (
            <TouchableOpacity
              key={item}
              className={`mr-2 px-4 py-3 rounded-md ${filter === item ? "bg-primary" : "bg-wash"}`}
              onPress={() => setFilter(item)}
            >
              <Text className={filter === item ? "text-white font-bold" : "text-ink font-bold"}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && filteredOrders.length === 0 && <Text className="text-muted">No orders found.</Text>}
        {filteredOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            className="border border-gray-100 rounded-lg p-4 mb-3"
            onPress={() => navigation.navigate("OrderDetail", { order })}
          >
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(order.status)}`}>{order.status}</Text>
            </View>
            <Text className="text-muted">Customer: {order.users?.phone || "Unknown"}</Text>
            <Text className="text-muted mt-1">Address: {order.addresses?.full_address || "No address"}</Text>
            <Text className="text-muted mt-1">Items: {itemsText(order) || "No items"}</Text>
            <View className="flex-row justify-between mt-3">
              <Text className="text-primary font-extrabold">{money(order.total_amount)}</Text>
              <Text className="text-muted">{dateTime(order.created_at)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

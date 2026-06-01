import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

export default function OrderCalendarScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateMockSession()
      .then((session) => api.getOrders(session.user.id))
      .then(setOrders)
      .catch((error) => Alert.alert("Order Calendar", error.message))
      .finally(() => setLoading(false));
  }, []);

  const groupedOrders = useMemo(() => {
    return orders.reduce((groups, order) => {
      const date = order.delivery_date || order.created_at?.slice(0, 10) || "Unscheduled";
      groups[date] = [...(groups[date] || []), order];
      return groups;
    }, {});
  }, [orders]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Order Calendar</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && Object.keys(groupedOrders).length === 0 && <Text className="text-muted">No scheduled orders.</Text>}
        {Object.entries(groupedOrders).map(([date, dateOrders]) => (
          <View key={date} className="mb-5">
            <Text className="text-primary font-extrabold text-lg mb-2">{date}</Text>
            {dateOrders.map((order) => (
              <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-2">
                <Text className="font-bold text-ink">#{order.id.slice(0, 8)} • {order.status}</Text>
                <Text className="text-muted mt-1">₹{Number(order.total_amount || 0)}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

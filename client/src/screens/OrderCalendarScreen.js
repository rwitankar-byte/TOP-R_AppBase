import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

const statusClasses = {
  Placed: "bg-blue-100 text-blue-700",
  Confirmed: "bg-orange-100 text-orange-700",
  "Out for Delivery": "bg-yellow-100 text-yellow-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700"
};

function getOrderDate(order) {
  return order.created_at?.slice(0, 10);
}

function isJarOrder(order) {
  if (order.order_type === "return" || order.type === "return") return false;
  if (order.subscription_id) return true;
  return (order.order_items || []).some((item) => {
    const productName = item.products?.name || item.product?.name || "";
    return productName.toLowerCase().includes("jar");
  });
}

export default function OrderCalendarScreen() {
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const session = await getOrCreateMockSession();
      const orderData = await api.getOrders(session.user.id);
      setOrders(orderData.filter(isJarOrder));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Order Calendar", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrders({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const markedDates = useMemo(() => {
    const marks = orders.reduce((dates, order) => {
      const date = getOrderDate(order);
      if (!date) return dates;
      dates[date] = {
        marked: true,
        dotColor: "#00B5B0",
        selectedColor: "#00B5B0"
      };
      return dates;
    }, {});

    return {
      ...marks,
      [selectedDate]: {
        ...(marks[selectedDate] || {}),
        selected: true,
        selectedColor: "#00B5B0"
      }
    };
  }, [orders, selectedDate]);

  const selectedOrders = useMemo(
    () => orders.filter((order) => getOrderDate(order) === selectedDate),
    [orders, selectedDate]
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <Text className="text-ink text-2xl font-extrabold my-4">Order Calendar</Text>
        {loading ? (
          <LoadingState message="Loading order calendar..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => loadOrders()} />
        ) : (
          <>
            <Calendar
              markedDates={markedDates}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              theme={{
                todayTextColor: "#00B5B0",
                selectedDayBackgroundColor: "#00B5B0",
                dotColor: "#00B5B0",
                arrowColor: "#00B5B0"
              }}
            />

            <Text className="text-ink font-extrabold text-lg mt-6 mb-3">{selectedDate}</Text>
            {orders.length === 0 ? (
              <EmptyState icon="calendar-outline" title="No jar orders yet" message="Subscription and jar delivery orders will appear on this calendar." />
            ) : selectedOrders.length === 0 ? (
              <EmptyState icon="calendar-clear-outline" title="No orders on this day" message="Choose a marked date to see jar deliveries." />
            ) : null}
            {selectedOrders.map((order) => (
              <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-ink font-extrabold">#{order.id.slice(0, 8)}</Text>
                  <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClasses[order.status] || "bg-gray-100 text-gray-700"}`}>
                    {order.status}
                  </Text>
                </View>
                <Text className="text-primary font-extrabold mt-2">₹{Number(order.total_amount || 0)}</Text>
              </View>
            ))}
          </>
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

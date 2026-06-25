import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getSession } from "../services/session";

const deliverySteps = ["Placed", "Confirmed", "Assigned", "Picked Up", "Delivered"];
const returnSteps = ["Placed", "Confirmed", "Assigned", "Picked Up", "Returned", "Refund Completed"];
const statusMessages = {
  Placed: "Your order has been placed and is waiting for confirmation.",
  Confirmed: "Your order has been confirmed.",
  Assigned: "A delivery boy has been assigned.",
  "Picked Up": "Your order is out for delivery.",
  Delivered: "Delivered successfully.",
  Returned: "Empty jars returned successfully.",
  "Refund Completed": "Refund completed to your wallet.",
  Cancelled: "This order was cancelled."
};

function orderLabel(order) {
  return {
    regular: "Product Order",
    delivery: "Product Order",
    subscription: "Subscription Started",
    refill: "Refill Request",
    return: "Return Request"
  }[order?.type || order?.order_type] || "Order";
}

export default function OrderTrackingScreen({ route }) {
  const [order, setOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const inFlightRequest = useRef(null);
  const steps = useMemo(() => ((order?.type || order?.order_type) === "return" ? returnSteps : deliverySteps), [order?.type, order?.order_type]);
  const currentIndex = useMemo(() => Math.max(0, steps.indexOf(order?.status || "Placed")), [order?.status, steps]);

  const loadOrder = useCallback(async ({ silent = false } = {}) => {
    if (inFlightRequest.current) return inFlightRequest.current;
    const request = (async () => {
      try {
        const storedSession = await getSession();
        if (!storedSession?.user?.id) return;
        const orders = await api.getOrders(storedSession.user.id);
        const selected = orders.find((item) => item.id === route.params?.orderId) || orders[0];
        setOrder(selected);
      } catch (error) {
        if (!silent) Alert.alert("Order tracking", error.message);
      } finally {
        inFlightRequest.current = null;
      }
    })();
    inFlightRequest.current = request;
    return request;
  }, [route.params?.orderId]);

  useEffect(() => {
    if (!isFocused) return undefined;
    loadOrder();
    const interval = setInterval(() => loadOrder({ silent: true }), 15000);
    return () => clearInterval(interval);
  }, [isFocused, loadOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrder();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <Text className="text-ink text-2xl font-extrabold my-4">Track Order</Text>
        <View className="border border-gray-100 rounded-lg p-4 mb-4">
          <Text className="text-primary font-bold">{orderLabel(order)}</Text>
          <Text className="text-ink font-extrabold mt-1">{order?.id ? `#${order.id.slice(0, 8)}` : route.params?.orderId || "Latest"}</Text>
          <Text className="text-muted mt-2">{statusMessages[order?.status] || "Order status is being updated."}</Text>
        </View>
        <View className="border border-gray-100 rounded-lg p-4 mb-5">
          {steps.map((step, index) => {
            const done = index <= currentIndex;
            const current = index === currentIndex;
            return (
              <View key={step} className="flex-row items-center mb-5 last:mb-0">
                <View className={`w-9 h-9 rounded-full items-center justify-center ${current ? "bg-accent" : done ? "bg-primary" : "bg-gray-200"}`}>
                  <Ionicons name={done ? "checkmark" : "ellipse"} size={18} color={done ? "#fff" : "#6B7280"} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className={`font-bold ${done ? "text-ink" : "text-muted"}`}>{step}</Text>
                  {current && <Text className="text-muted text-xs mt-1">{statusMessages[step]}</Text>}
                </View>
              </View>
            );
          })}
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Delivery boy details</Text>
        <View className="border border-gray-100 rounded-lg p-4">
          {order?.delivery_boys ? (
            <>
              <Text className="text-ink font-bold">{order.delivery_boys.name}</Text>
              <Text className="text-muted mt-1">Phone: {order.delivery_boys.phone}</Text>
            </>
          ) : (
            <Text className="text-muted">Delivery boy will be assigned after confirmation.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

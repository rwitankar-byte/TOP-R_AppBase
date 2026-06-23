import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getSession } from "../services/session";

const steps = ["Placed", "Confirmed", "Out for Delivery", "Delivered"];

export default function OrderTrackingScreen({ route }) {
  const [order, setOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const inFlightRequest = useRef(null);
  const currentIndex = useMemo(() => Math.max(0, steps.indexOf(order?.status || "Placed")), [order?.status]);

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
        <Text className="text-ink text-2xl font-extrabold my-4">Order {order?.id || route.params?.orderId || "Latest"}</Text>
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

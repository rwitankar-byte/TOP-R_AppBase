import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId, statusClass } from "../utils/format";
import { getReturnActions } from "../utils/returnStatus";

const VALID_TRANSITIONS = {
  Placed: ["Confirmed", "Cancelled"],
  Confirmed: ["Out for Delivery", "Cancelled"],
  "Out for Delivery": ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: []
};

const statusLabels = {
  Confirmed: "Confirm",
  "Out for Delivery": "Out for Delivery",
  Delivered: "Delivered",
  Cancelled: "Cancel"
};

export default function OrderDetailScreen({ navigation, route }) {
  const [order, setOrder] = useState(route.params.order);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const inFlightRequest = useRef(null);
  const isRefill = order.order_type === "refill" || order.type === "refill";
  const isReturn = order.order_type === "return" || order.type === "return";
  const nextStatuses = isReturn ? getReturnActions(order.status) : (VALID_TRANSITIONS[order.status] || []).map((status) => ({ status, label: statusLabels[status], destructive: status === "Cancelled" }));

  const loadOrder = useCallback(async ({ silent = false } = {}) => {
    if (inFlightRequest.current) return inFlightRequest.current;
    const request = (async () => {
      try {
        const orders = await api.getOrders();
        const updatedOrder = orders.find((item) => item.id === route.params.order.id);
        if (updatedOrder) setOrder(updatedOrder);
      } catch (error) {
        if (!silent) Alert.alert("Order detail", error.message);
      } finally {
        inFlightRequest.current = null;
      }
    })();
    inFlightRequest.current = request;
    return request;
  }, [route.params.order.id]);

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

  const updateStatus = async (status) => {
    setSaving(true);
    try {
      const result = isReturn ? await api.advanceReturn(order.id, status) : await api.updateOrderStatus(order.id, status);
      const updatedOrder = isReturn ? result.order : result;
      setOrder((current) => ({ ...current, ...updatedOrder }));
      if (isReturn && status === "Picked Up") {
        Alert.alert("Jars picked up", "The returned jars are ready for inspection.");
      } else if (isReturn && status === "Returned") {
        Alert.alert("Return completed", "The jars have been marked as returned. Process the wallet refund next.");
      } else if (isReturn && status === "Refund Completed") {
        Alert.alert("Refund completed", `${money(result.refund_amount)} has been credited to the customer wallet.`);
      } else {
        Alert.alert("Order updated", `Status changed to ${status}.`);
      }
    } catch (error) {
      Alert.alert("Order update failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
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

        {nextStatuses.length ? (
          <>
            <Text className="text-ink font-extrabold text-lg mt-4 mb-3">Update status</Text>
            {nextStatuses.map((action) => (
              <TouchableOpacity
                key={action.status}
                className={`rounded-lg py-4 items-center mb-3 ${action.destructive ? "bg-red-500" : "bg-primary"}`}
                onPress={() => updateStatus(action.status)}
                disabled={saving}
              >
                <Text className="text-white font-extrabold">{action.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View className="bg-gray-100 rounded-lg p-4 mt-4 mb-3">
            <Text className="text-muted font-bold">
              {order.status === "Delivered" ? "Order Delivered - No further action possible" : order.status === "Cancelled" ? "Order Cancelled - No further action possible" : "This return has no further actions."}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

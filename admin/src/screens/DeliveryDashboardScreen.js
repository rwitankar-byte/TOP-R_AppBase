import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { shortId, statusClass } from "../utils/format";

function isReturn(order) {
  return (order.type || order.order_type) === "return";
}

export default function DeliveryDashboardScreen({ navigation, route }) {
  const deliveryBoy = route.params.deliveryBoy;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      setOrders(await api.getDeliveryOrders(deliveryBoy.id));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Delivery dashboard", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadOrders();
  }, [deliveryBoy.id]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrders({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const updateStatus = async (order, status) => {
    setUpdatingId(order.id);
    try {
      await api.updateDeliveryOrderStatus(order.id, deliveryBoy.id, status);
      await loadOrders({ showLoading: false });
    } catch (error) {
      Alert.alert("Status update failed", error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}>
        <ScreenHeader title="My Deliveries" subtitle={`${deliveryBoy.name} • ${deliveryBoy.phone}`} onBack={navigation.goBack} rightAction={loadOrders} />
        {loading && <LoadingState message="Loading assigned orders..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={() => loadOrders()} /> : null}
        {!loading && !errorMessage && orders.length === 0 && (
          <EmptyState icon="file-tray-outline" title="No active assigned orders" message="Assigned deliveries will appear here." />
        )}
        {orders.map((order) => {
          const targetStatus = order.status === "Assigned" ? "Picked Up" : isReturn(order) ? "Returned" : "Delivered";
          return (
            <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
              <View className="flex-row justify-between items-center"><Text className="text-ink font-extrabold">{shortId(order.id)}</Text><Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(order.status)}`}>{order.status}</Text></View>
              <Text className="text-muted mt-2">Customer: {order.users?.phone || "Unknown"}</Text>
              <Text className="text-muted mt-1">Address: {order.addresses?.full_address || "No address"}</Text>
              <Text className="text-muted mt-1">Items: {(order.order_items || []).map((item) => `${item.products?.name || item.product_id} x ${item.quantity}`).join(", ")}</Text>
              <TouchableOpacity className="bg-primary rounded-lg py-3 items-center mt-4" onPress={() => updateStatus(order, targetStatus)} disabled={updatingId === order.id}>
                <Text className="text-white font-extrabold">{updatingId === order.id ? "Updating..." : targetStatus === "Returned" ? "Mark Returned" : targetStatus === "Delivered" ? "Mark Delivered" : "Mark Picked Up"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

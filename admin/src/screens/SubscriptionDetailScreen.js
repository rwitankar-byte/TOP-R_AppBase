import { useCallback, useEffect, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId, statusClass } from "../utils/format";
import { getReturnActions } from "../utils/returnStatus";

export default function SubscriptionDetailScreen({ navigation, route }) {
  const [subscription, setSubscription] = useState(route.params.subscription);
  const [returnOrders, setReturnOrders] = useState([]);
  const [refillOrders, setRefillOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDetails = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const [returns, refills] = await Promise.all([api.getReturnRequests(), api.getSubscriptionRefills(subscription.id)]);
      setReturnOrders(returns.filter((order) => order.subscription_id === subscription.id || order.subscription?.id === subscription.id));
      setRefillOrders(refills);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Subscription details", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [subscription.id]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDetails({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const advanceReturn = async (order, targetStatus) => {
    setUpdatingId(order.id);
    try {
      const result = await api.advanceReturn(order.id, targetStatus);
      setSubscription(result.subscription);
      if (targetStatus === "Picked Up") {
        Alert.alert("Jars picked up", "The returned jars are ready for inspection.");
      } else if (targetStatus === "Returned") {
        Alert.alert("Return completed", "The jars have been marked as returned. Process the wallet refund next.");
      } else if (targetStatus === "Refund Completed") {
        Alert.alert("Refund completed", `${money(result.refund_amount)} has been credited to the customer wallet.`);
      } else if (targetStatus === "Cancelled") {
        Alert.alert("Return rejected", "The subscription remains Active.");
      } else {
        Alert.alert("Return updated", `Return request is now ${targetStatus}.`);
      }
      await loadDetails({ showLoading: false });
    } catch (error) {
      Alert.alert("Return update failed", error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}>
        <ScreenHeader title="Subscription Detail" subtitle={shortId(subscription.id)} onBack={navigation.goBack} />
        <View className="border border-gray-100 rounded-lg p-4 mb-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-ink font-extrabold">{subscription.products?.name || "Water Jar"}</Text>
            <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(subscription.status)}`}>{subscription.status}</Text>
          </View>
          <Text className="text-muted mt-2">Customer: {subscription.users?.phone || "Unknown"}</Text>
          <Text className="text-muted mt-1">Jars owned: {subscription.jar_count || subscription.quantity}</Text>
          <Text className="text-primary font-extrabold mt-2">Deposit {money(subscription.jar_deposit)} • Water fill {money(subscription.water_charge_per_delivery)}</Text>
          <Text className="text-muted mt-1">Deposit refunded: {subscription.deposit_refunded ? "Yes - wallet credit completed" : "No"}</Text>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Refill history ({refillOrders.length})</Text>
        {loading && <LoadingState message="Loading subscription details..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={() => loadDetails()} /> : null}
        {!loading && !errorMessage && refillOrders.length === 0 && <EmptyState icon="water-outline" title="No refills requested" message="Refill history for this subscription will appear here." />}
        {refillOrders.map((order) => (
          <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <View className="flex-row justify-between"><Text className="text-ink font-extrabold">{shortId(order.id)}</Text><Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(order.status)}`}>{order.status}</Text></View>
            <Text className="text-muted mt-2">{order.order_items?.[0]?.quantity || 0} jars • {dateTime(order.created_at)}</Text>
            <Text className="text-primary font-extrabold mt-2">{money(order.total_amount)}</Text>
          </View>
        ))}

        <Text className="text-ink font-extrabold text-lg mt-4 mb-3">Return Request</Text>
        {!loading && !errorMessage && returnOrders.length === 0 && <EmptyState icon="archive-outline" title="No active return request" message="Cancellation and jar returns will appear here." />}
        {returnOrders.map((order) => {
          const jarCount = Number(order.jar_count || subscription.jar_count || subscription.quantity || 1);
          return (
            <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
              <View className="flex-row justify-between"><Text className="text-ink font-extrabold">{shortId(order.id)}</Text><Text className="text-primary font-extrabold">{money(jarCount * 250)} deposit</Text></View>
              <Text className="text-muted mt-2">Status: {order.status}</Text>
              <Text className="text-muted mt-1">Jars: {jarCount}</Text>
              <TouchableOpacity className="mt-3" onPress={() => navigation.navigate("OrderDetail", { order })}>
                <Text className="text-primary font-bold">View order / assign delivery boy</Text>
              </TouchableOpacity>
              {getReturnActions(order.status).map((action) => (
                <TouchableOpacity key={action.status} className={`rounded-lg py-3 items-center mt-3 ${action.destructive ? "bg-red-500" : "bg-primary"}`} onPress={() => advanceReturn(order, action.status)} disabled={updatingId === order.id}>
                  <Text className="text-white font-extrabold">{updatingId === order.id ? "Updating..." : action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

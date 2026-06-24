import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, statusClass } from "../utils/format";
import { getReturnActions } from "../utils/returnStatus";

const activeStatuses = ["Active", "Paused"];
const returnStatuses = ["Cancellation Requested", "Return Pending", "Picked Up", "Returned", "Refund Completed"];

export default function SubscriptionsScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [returnOrders, setReturnOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadSubscriptions = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const [subscriptionData, returnData] = await Promise.all([
        api.getSubscriptions(),
        api.getReturnRequests()
      ]);
      setSubscriptions(subscriptionData);
      setReturnOrders(returnData.filter((order) => returnStatuses.includes(order.subscription?.status) || order.status !== "Cancelled"));
    } catch (error) {
      Alert.alert("Subscriptions", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadSubscriptions();
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadSubscriptions({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const advanceReturn = async (order, targetStatus) => {
    setUpdatingId(order.id);
    try {
      const result = await api.advanceReturn(order.id, targetStatus);
      if (targetStatus === "Refund Completed") {
        Alert.alert("Refund completed", `${money(result.refund_amount)} has been credited to the customer wallet.`);
      } else if (targetStatus === "Cancelled") {
        Alert.alert("Return rejected", "The subscription is active again.");
      } else {
        Alert.alert("Return updated", `Return request is now ${targetStatus}.`);
      }
      await loadSubscriptions({ showLoading: false });
    } catch (error) {
      Alert.alert("Return update failed", error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeSubscriptions = subscriptions.filter((subscription) => activeStatuses.includes(subscription.status));
  const cancellationRequests = returnOrders.filter((order) => {
    const status = order.subscription?.status;
    return returnStatuses.includes(status) || ["Placed", "Confirmed", "Picked Up", "Returned", "Refund Completed"].includes(order.status);
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <ScreenHeader title="Subscriptions" subtitle="Customer jar ownership" rightAction={loadSubscriptions} />
        {loading && <ActivityIndicator color="#00B5B0" />}

        <Text className="text-ink font-extrabold text-lg mb-3">Active Subscriptions</Text>
        {!loading && activeSubscriptions.length === 0 && <Text className="text-muted mb-5">No active subscriptions found.</Text>}
        {activeSubscriptions.map((subscription) => (
          <TouchableOpacity
            key={subscription.id}
            className="border border-gray-100 rounded-lg p-4 mb-3"
            onPress={() => navigation.navigate("SubscriptionDetail", { subscription })}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-ink font-extrabold">{subscription.products?.name || "Water Jar"}</Text>
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(subscription.status)}`}>{subscription.status}</Text>
            </View>
            <Text className="text-muted mt-2">Customer: {subscription.users?.phone || "Unknown"}</Text>
            <Text className="text-muted mt-1">Jars owned: {subscription.jar_count || subscription.quantity}</Text>
            <Text className="text-primary font-extrabold mt-2">Deposit {money(subscription.jar_deposit)} • Water fill {money(subscription.water_charge_per_delivery)}</Text>
          </TouchableOpacity>
        ))}

        <Text className="text-ink font-extrabold text-lg mt-3 mb-3">Cancellation / Return Requests</Text>
        {!loading && cancellationRequests.length === 0 && <Text className="text-muted mb-5">No cancellation or return requests.</Text>}
        {cancellationRequests.map((order) => {
          const subscription = order.subscription;
          const jarCount = Number(order.jar_count || subscription?.jar_count || subscription?.quantity || order.order_items?.[0]?.quantity || 1);
          const actions = getReturnActions(order.status);
          return (
            <View key={order.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 mb-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-ink font-extrabold">{subscription?.products?.name || order.order_items?.[0]?.products?.name || "Water Jar"}</Text>
                <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(subscription?.status || order.status)}`}>{subscription?.status || order.status}</Text>
              </View>
              <Text className="text-muted mt-2">Customer: {order.users?.phone || subscription?.users?.phone || "Unknown"}</Text>
              <Text className="text-muted mt-1">Jars: {jarCount} • Requested: {dateTime(order.created_at)}</Text>
              <Text className="text-primary font-extrabold mt-2">Refund due: {money(jarCount * 250)}</Text>
              <TouchableOpacity className="mt-3" onPress={() => subscription && navigation.navigate("SubscriptionDetail", { subscription })}>
                <Text className="text-primary font-bold">View subscription details</Text>
              </TouchableOpacity>
              {actions.map((action) => (
                <TouchableOpacity
                  key={action.status}
                  className={`rounded-lg py-3 items-center mt-3 ${action.destructive ? "bg-red-500" : "bg-primary"}`}
                  onPress={() => advanceReturn(order, action.status)}
                  disabled={updatingId === order.id}
                >
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

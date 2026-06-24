import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId } from "../utils/format";
import { getReturnActions } from "../utils/returnStatus";

export default function ReturnRequestsScreen({ navigation }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadReturns = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      setReturns(await api.getReturnRequests());
    } catch (error) {
      Alert.alert("Return Requests", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadReturns();
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadReturns({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const advanceReturn = async (order, targetStatus) => {
    setUpdatingId(order.id);
    try {
      const result = await api.advanceReturn(order.id, targetStatus);
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
      await loadReturns({ showLoading: false });
    } catch (error) {
      Alert.alert("Return update failed", error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}>
        <ScreenHeader title="Return Requests" subtitle="Cancellation and return workflow" onBack={navigation.goBack} rightAction={loadReturns} />
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && returns.length === 0 && <Text className="text-muted">No pending returns.</Text>}
        {returns.map((order) => {
          const subscription = order.subscription;
          const jarCount = Number(order.jar_count || subscription?.jar_count || subscription?.quantity || order.order_items?.[0]?.quantity || 1);
          const actions = getReturnActions(order.status);
          return (
            <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
              <View className="flex-row justify-between">
                <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
                <Text className="text-primary font-extrabold">{money(jarCount * 250)}</Text>
              </View>
              <Text className="text-muted mt-2">Status: {order.status}</Text>
              <Text className="text-muted mt-1">Customer: {order.users?.phone || "Unknown"}</Text>
              <Text className="text-muted mt-1">Product: {subscription?.products?.name || order.order_items?.[0]?.products?.name || "Water Jar"}</Text>
              <Text className="text-muted mt-1">Jars: {jarCount}</Text>
              <Text className="text-muted mt-1">Date: {dateTime(order.created_at)}</Text>
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

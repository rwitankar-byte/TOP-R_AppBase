import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId } from "../utils/format";

function getReturnPayload(order) {
  const subscription = order.subscription;
  const jarCount = Number(order.jar_count || subscription?.jar_count || subscription?.quantity || order.order_items?.[0]?.quantity || 1);
  return {
    order_id: order.id,
    subscription_id: order.subscription_id || subscription?.id,
    user_id: order.user_id,
    jar_count: jarCount
  };
}

export default function ReturnRequestsScreen({ navigation }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

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

  const approve = async (order) => {
    setApprovingId(order.id);
    try {
      const result = await api.approveReturn(getReturnPayload(order));
      setReturns((current) => current.filter((item) => item.id !== order.id));
      Alert.alert("Return approved", `Refund of ${money(result.refund_amount)} credited to customer wallet.`);
    } catch (error) {
      Alert.alert("Approve return failed", error.message);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <ScreenHeader title="Return Requests" subtitle="Pending jar pickups" onBack={navigation.goBack} rightAction={loadReturns} />
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && returns.length === 0 && <Text className="text-muted">No pending returns.</Text>}
        {returns.map((order) => {
          const subscription = order.subscription;
          const jarCount = Number(order.jar_count || subscription?.jar_count || subscription?.quantity || order.order_items?.[0]?.quantity || 1);
          return (
            <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
              <View className="flex-row justify-between">
                <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
                <Text className="text-primary font-extrabold">{money(jarCount * 250)}</Text>
              </View>
              <Text className="text-muted mt-2">Customer: {order.users?.phone || "Unknown"}</Text>
              <Text className="text-muted mt-1">Product: {subscription?.products?.name || order.order_items?.[0]?.products?.name || "Water Jar"}</Text>
              <Text className="text-muted mt-1">Jars: {jarCount}</Text>
              <Text className="text-muted mt-1">Date: {dateTime(order.created_at)}</Text>
              <TouchableOpacity
                className="bg-primary rounded-lg py-3 items-center mt-4"
                onPress={() => approve(order)}
                disabled={approvingId === order.id}
              >
                <Text className="text-white font-extrabold">{approvingId === order.id ? "Approving..." : "Approve"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

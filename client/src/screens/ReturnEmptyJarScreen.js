import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

const returnStatuses = ["Cancellation Requested", "Return Pending", "Picked Up", "Returned", "Refund Completed", "Cancelled"];

function returnStatusText(status) {
  const messages = {
    "Cancellation Requested": "Cancellation Requested - Awaiting Confirmation",
    "Return Pending": "Return Pending - Please keep empty jars ready",
    "Picked Up": "Empty jars picked up - Refund verification in progress",
    Returned: "Jars returned successfully - Refund will be processed soon",
    "Refund Completed": "Refund completed to your wallet",
    Cancelled: "Subscription cancelled"
  };
  return messages[status] || "Return request pending";
}

export default function ReturnEmptyJarScreen() {
  const [session, setSession] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReturnData = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const storedSession = await getOrCreateMockSession();
      setSession(storedSession);
      const [subscriptionData, returnData] = await Promise.all([
        api.getSubscriptions(storedSession.user.id),
        api.getOrders(storedSession.user.id, { type: "return" })
      ]);
      setSubscriptions(subscriptionData.filter((subscription) => ["Active", "Paused", ...returnStatuses].includes(subscription.status)));
      setPendingReturns(returnData);
    } catch (error) {
      Alert.alert("Return Empty Jar", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReturnData();
  }, [loadReturnData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadReturnData({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const findPendingReturn = (subscription) =>
    pendingReturns.find(
      (order) =>
        order.user_id === subscription.user_id &&
        order.status !== "Cancelled" &&
        (order.subscription_id === subscription.id || order.order_items?.some((item) => item.product_id === subscription.product_id))
    );

  const requestReturn = (subscription) => {
    const jars = Number(subscription.jar_count || subscription.quantity || 1);
    const productName = subscription.products?.name || "Water Jar Subscription";
    Alert.alert("Return jars", `Return ${jars} jars from ${productName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: async () => {
          try {
            await api.placeOrder({
              type: "return",
              user_id: session.user.id,
              address_id: subscription.address_id,
              subscription_id: subscription.id,
              total_amount: 0,
              delivery_date: new Date().toISOString().slice(0, 10),
              items: [
                {
                  product_id: subscription.product_id,
                  quantity: jars,
                  unit_price: 0
                }
              ]
            });
            Alert.alert("Return request sent", "Admin will confirm pickup soon. Your deposit will be refunded after the jars are returned.");
            await loadReturnData();
          } catch (error) {
            Alert.alert("Return failed", error.message);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <Text className="text-ink text-2xl font-extrabold my-4">Return Empty Jar</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && subscriptions.length === 0 && <Text className="text-muted">No return requests yet.</Text>}
        {subscriptions.map((subscription) => {
          const jars = Number(subscription.jar_count || subscription.quantity || 1);
          const pendingReturn = findPendingReturn(subscription);
          const completed = subscription.status === "Cancelled";
          return (
            <View key={subscription.id} className="border border-gray-100 rounded-lg p-4 mb-3">
              <Text className="font-extrabold text-ink">{subscription.products?.name || "Water Jar Subscription"}</Text>
              <Text className="text-muted mt-1">{jars} jars subscribed</Text>
              {(pendingReturn || completed) && <Text className="text-primary font-bold mt-2">{returnStatusText(subscription.status)}</Text>}
              {!completed && (
                <TouchableOpacity
                  className={`rounded-lg py-3 items-center mt-3 ${pendingReturn ? "bg-gray-300" : "bg-primary"}`}
                  onPress={() => requestReturn(subscription)}
                  disabled={Boolean(pendingReturn)}
                >
                  <Text className="text-white font-bold">
                    {pendingReturn ? returnStatusText(subscription.status) : "Request Return"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

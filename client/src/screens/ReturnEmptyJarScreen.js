import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

export default function ReturnEmptyJarScreen() {
  const [session, setSession] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pendingReturns, setPendingReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReturnData = async () => {
    setLoading(true);
    try {
      const storedSession = await getOrCreateMockSession();
      setSession(storedSession);
      const [subscriptionData, returnData] = await Promise.all([
        api.getSubscriptions(storedSession.user.id, "Active"),
        api.getOrders(storedSession.user.id, { type: "return", status: "Placed" })
      ]);
      setSubscriptions(subscriptionData);
      setPendingReturns(returnData);
    } catch (error) {
      Alert.alert("Return Empty Jar", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturnData();
  }, []);

  const findPendingReturn = (subscription) =>
    pendingReturns.find(
      (order) =>
        order.user_id === subscription.user_id &&
        order.status === "Placed" &&
        order.order_items?.some((item) => item.product_id === subscription.product_id)
    );

  const requestReturn = (subscription) => {
    const jars = Number(subscription.jar_count || subscription.quantity || 1);
    const productName = subscription.products?.name || "Water Jar Subscription";
    const refund = jars * 250;
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
            Alert.alert("Return request placed", `Refund of ₹${refund} will be processed after jar pickup.`);
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
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Return Empty Jar</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && subscriptions.length === 0 && <Text className="text-muted">No active subscriptions with jars.</Text>}
        {subscriptions.map((subscription) => {
          const jars = Number(subscription.jar_count || subscription.quantity || 1);
          const pendingReturn = findPendingReturn(subscription);
          return (
            <View key={subscription.id} className="border border-gray-100 rounded-lg p-4 mb-3">
              <Text className="font-extrabold text-ink">{subscription.products?.name || "Water Jar Subscription"}</Text>
              <Text className="text-muted mt-1">{jars} jars subscribed</Text>
              {pendingReturn && (
                <Text className="text-primary font-bold mt-2">Return request pending. Awaiting pickup and approval.</Text>
              )}
              <TouchableOpacity
                className={`rounded-lg py-3 items-center mt-3 ${pendingReturn ? "bg-gray-300" : "bg-primary"}`}
                onPress={() => requestReturn(subscription)}
                disabled={Boolean(pendingReturn)}
              >
                <Text className="text-white font-bold">
                  {pendingReturn ? "Return Requested - Pending Approval" : "Request Return"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

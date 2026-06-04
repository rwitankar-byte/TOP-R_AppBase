import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { money, nextDeliveryDate, shortId, statusClass } from "../utils/format";

export default function SubscriptionDetailScreen({ navigation, route }) {
  const [subscription, setSubscription] = useState(route.params.subscription);
  const [returnOrders, setReturnOrders] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadReturnOrders = () => {
    setLoadingReturns(true);
    api.getReturnRequests()
      .then((orders) =>
        setReturnOrders(
          orders.filter(
            (order) =>
              order.user_id === subscription.user_id &&
              (order.subscription_id === subscription.id ||
                order.subscription?.id === subscription.id ||
                order.order_items?.some((item) => item.product_id === subscription.product_id))
          )
        )
      )
      .catch((error) => Alert.alert("Return requests", error.message))
      .finally(() => setLoadingReturns(false));
  };

  useEffect(() => {
    loadReturnOrders();
  }, [subscription.user_id]);

  const markDeliveryDone = async () => {
    Alert.alert("Delivery marked", "Delivery completion record can be stored when a delivery table is added.");
  };

  const approveReturn = async (order) => {
    const jarCount = Number(order?.jar_count || subscription.jar_count || subscription.quantity || order?.order_items?.[0]?.quantity || 1);
    setSaving(true);
    try {
      const result = await api.approveReturn({
        order_id: order?.id,
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        jar_count: jarCount
      });
      setSubscription(result.subscription);
      setReturnOrders((current) => current.filter((item) => item.id !== order?.id));
      Alert.alert("Return approved", `Wallet credited ${money(result.refund_amount)}.`);
    } catch (error) {
      Alert.alert("Approve return failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Subscription Detail" subtitle={shortId(subscription.id)} onBack={navigation.goBack} />
        <View className="border border-gray-100 rounded-lg p-4 mb-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-ink font-extrabold">{subscription.products?.name || "Water Jar"}</Text>
            <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(subscription.status)}`}>
              {subscription.status}
            </Text>
          </View>
          <Text className="text-muted mt-2">Customer: {subscription.users?.phone || "Unknown"}</Text>
          <Text className="text-muted mt-1">Jars: {subscription.jar_count || subscription.quantity}</Text>
          <Text className="text-muted mt-1">Frequency: {subscription.frequency}</Text>
          <Text className="text-muted mt-1">Next delivery: {nextDeliveryDate(subscription)}</Text>
          <Text className="text-primary font-extrabold mt-2">
            Deposit {money(subscription.jar_deposit)} • Delivery {money(subscription.water_charge_per_delivery)}
          </Text>
          <Text className="text-muted mt-1">Deposit refunded: {subscription.deposit_refunded ? "Yes" : "No"}</Text>
        </View>

        <TouchableOpacity className="bg-primary rounded-lg py-4 items-center mb-3" onPress={markDeliveryDone}>
          <Text className="text-white font-extrabold">Mark Delivery Done</Text>
        </TouchableOpacity>

        <Text className="text-ink font-extrabold text-lg mb-3">Pending Returns</Text>
        {loadingReturns && <ActivityIndicator color="#00B5B0" />}
        {!loadingReturns && returnOrders.length === 0 && <Text className="text-muted">No pending returns found.</Text>}
        {returnOrders.map((order) => {
          const jarCount = Number(order.jar_count || subscription.jar_count || subscription.quantity || order.order_items?.[0]?.quantity || 1);
          return (
            <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
              <View className="flex-row justify-between">
                <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
                <Text className="text-primary font-extrabold">{money(jarCount * 250)}</Text>
              </View>
              <Text className="text-muted mt-2">Customer: {subscription.users?.name || subscription.users?.phone || "Unknown"}</Text>
              <Text className="text-muted mt-1">Jars: {jarCount}</Text>
              <TouchableOpacity
                className="bg-accent rounded-lg py-3 items-center mt-4"
                onPress={() => approveReturn(order)}
                disabled={saving}
              >
                <Text className="text-ink font-extrabold">{saving ? "Approving..." : "Approve Return"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

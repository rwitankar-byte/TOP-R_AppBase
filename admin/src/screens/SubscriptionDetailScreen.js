import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId, statusClass } from "../utils/format";

export default function SubscriptionDetailScreen({ navigation, route }) {
  const [subscription, setSubscription] = useState(route.params.subscription);
  const [returnOrders, setReturnOrders] = useState([]);
  const [refillOrders, setRefillOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const [returns, refills] = await Promise.all([api.getReturnRequests(), api.getSubscriptionRefills(subscription.id)]);
      setReturnOrders(
        returns.filter(
          (order) =>
            order.user_id === subscription.user_id &&
            (order.subscription_id === subscription.id || order.subscription?.id === subscription.id)
        )
      );
      setRefillOrders(refills);
    } catch (error) {
      Alert.alert("Subscription details", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [subscription.id]);

  const approveReturn = async (order) => {
    const jarCount = Number(order?.jar_count || subscription.jar_count || subscription.quantity || 1);
    setSaving(true);
    try {
      const result = await api.approveReturn({
        order_id: order.id,
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        jar_count: jarCount
      });
      setSubscription(result.subscription);
      setReturnOrders((current) => current.filter((item) => item.id !== order.id));
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
            <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(subscription.status)}`}>{subscription.status}</Text>
          </View>
          <Text className="text-muted mt-2">Customer: {subscription.users?.phone || "Unknown"}</Text>
          <Text className="text-muted mt-1">Jars owned: {subscription.jar_count || subscription.quantity}</Text>
          <Text className="text-primary font-extrabold mt-2">Deposit {money(subscription.jar_deposit)} • Water fill {money(subscription.water_charge_per_delivery)}</Text>
          <Text className="text-muted mt-1">Deposit refunded: {subscription.deposit_refunded ? "Yes" : "No"}</Text>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Refill history ({refillOrders.length})</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && refillOrders.length === 0 && <Text className="text-muted mb-4">No refills have been requested.</Text>}
        {refillOrders.map((order) => (
          <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <View className="flex-row justify-between">
              <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(order.status)}`}>{order.status}</Text>
            </View>
            <Text className="text-muted mt-2">{order.order_items?.[0]?.quantity || 0} jars • {dateTime(order.created_at)}</Text>
            <Text className="text-primary font-extrabold mt-2">{money(order.total_amount)}</Text>
          </View>
        ))}

        <Text className="text-ink font-extrabold text-lg mt-4 mb-3">Pending Returns</Text>
        {!loading && returnOrders.length === 0 && <Text className="text-muted">No pending returns found.</Text>}
        {returnOrders.map((order) => {
          const jarCount = Number(order.jar_count || subscription.jar_count || subscription.quantity || 1);
          return (
            <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
              <View className="flex-row justify-between">
                <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
                <Text className="text-primary font-extrabold">{money(jarCount * 250)}</Text>
              </View>
              <Text className="text-muted mt-2">Jars: {jarCount}</Text>
              <TouchableOpacity className="bg-accent rounded-lg py-3 items-center mt-4" onPress={() => approveReturn(order)} disabled={saving}>
                <Text className="text-ink font-extrabold">{saving ? "Approving..." : "Approve Return"}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

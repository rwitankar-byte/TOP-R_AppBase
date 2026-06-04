import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { money, nextDeliveryDate, shortId, statusClass } from "../utils/format";

function isReturnOrder(order) {
  return order.order_type === "return" || order.type === "return";
}

export default function SubscriptionDetailScreen({ navigation, route }) {
  const [subscription, setSubscription] = useState(route.params.subscription);
  const [returnOrders, setReturnOrders] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getOrders()
      .then((orders) => setReturnOrders(orders.filter((order) => isReturnOrder(order) && order.user_id === subscription.user_id)))
      .catch((error) => Alert.alert("Return requests", error.message))
      .finally(() => setLoadingReturns(false));
  }, [subscription.user_id]);

  const markDeliveryDone = async () => {
    Alert.alert("Delivery marked", "Delivery completion record can be stored when a delivery table is added.");
  };

  const approveReturn = async () => {
    setSaving(true);
    try {
      const result = await api.approveReturn(subscription.id);
      setSubscription(result.subscription);
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
        <TouchableOpacity className="bg-accent rounded-lg py-4 items-center mb-5" onPress={approveReturn} disabled={saving}>
          <Text className="text-ink font-extrabold">{saving ? "Approving..." : "Approve Return"}</Text>
        </TouchableOpacity>

        <Text className="text-ink font-extrabold text-lg mb-3">Return requests</Text>
        {loadingReturns && <ActivityIndicator color="#00B5B0" />}
        {!loadingReturns && returnOrders.length === 0 && <Text className="text-muted">No return requests found.</Text>}
        {returnOrders.map((order) => (
          <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
            <Text className="text-muted mt-1">{order.status}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

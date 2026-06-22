import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { money, statusClass } from "../utils/format";

const filters = ["Active", "Paused", "Cancelled"];

export default function SubscriptionsScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [filter, setFilter] = useState("Active");
  const [loading, setLoading] = useState(true);

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      setSubscriptions(await api.getSubscriptions(filter));
    } catch (error) {
      Alert.alert("Subscriptions", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadSubscriptions();
  }, [filter]));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Subscriptions" subtitle="Customer jar ownership" rightAction={loadSubscriptions} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {filters.map((item) => (
            <TouchableOpacity
              key={item}
              className={`mr-2 px-4 py-3 rounded-md ${filter === item ? "bg-primary" : "bg-wash"}`}
              onPress={() => setFilter(item)}
            >
              <Text className={filter === item ? "text-white font-bold" : "text-ink font-bold"}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && subscriptions.length === 0 && <Text className="text-muted">No subscriptions found.</Text>}
        {subscriptions.map((subscription) => (
          <TouchableOpacity
            key={subscription.id}
            className="border border-gray-100 rounded-lg p-4 mb-3"
            onPress={() => navigation.navigate("SubscriptionDetail", { subscription })}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-ink font-extrabold">{subscription.products?.name || "Water Jar"}</Text>
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(subscription.status)}`}>
                {subscription.status}
              </Text>
            </View>
            <Text className="text-muted mt-2">Customer: {subscription.users?.phone || "Unknown"}</Text>
            <Text className="text-muted mt-1">
              Jars owned: {subscription.jar_count || subscription.quantity}
            </Text>
            <Text className="text-primary font-extrabold mt-2">
              Deposit {money(subscription.jar_deposit)} • Water fill {money(subscription.water_charge_per_delivery)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

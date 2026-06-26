import { useCallback, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money } from "../utils/format";

const SORT_OPTIONS = [
  { label: "Newest customer", value: "newest" },
  { label: "Last order", value: "lastOrder" },
  { label: "Highest wallet", value: "wallet" },
  { label: "Highest spent", value: "spent" }
];

function addressText(customer) {
  const address = customer.default_address;
  if (!address) return "No default address";
  return customer.default_address_preview || [
    address.full_address,
    address.landmark,
    address.area,
    address.city,
    address.pincode
  ].filter(Boolean).join(", ");
}

function toTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export default function CustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCustomers = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      setCustomers(await api.getCustomers());
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Customers", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadCustomers();
  }, [loadCustomers]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCustomers({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const visibleCustomers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      if (!needle) return true;
      return [
        customer.name,
        customer.phone,
        addressText(customer)
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "lastOrder") return toTime(b.last_order_at) - toTime(a.last_order_at);
      if (sortBy === "wallet") return Number(b.wallet_balance || 0) - Number(a.wallet_balance || 0);
      if (sortBy === "spent") return Number(b.total_spent || 0) - Number(a.total_spent || 0);
      return toTime(b.created_at) - toTime(a.created_at);
    });
  }, [customers, query, sortBy]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <ScreenHeader title="Customers" subtitle="Customer accounts, orders, wallets" rightAction={() => loadCustomers()} />

        <TextInput
          className="border border-gray-200 rounded-lg px-4 py-3 text-ink mb-3"
          placeholder="Search name, phone, or address"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#7A8B99"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              className={`px-4 py-2 rounded-full mr-2 border ${sortBy === option.value ? "bg-primary border-primary" : "bg-white border-gray-200"}`}
              onPress={() => setSortBy(option.value)}
            >
              <Text className={sortBy === option.value ? "text-white font-bold" : "text-muted font-bold"}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <LoadingState message="Loading customers..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={() => loadCustomers()} /> : null}
        {!loading && !errorMessage && visibleCustomers.length === 0 && (
          <EmptyState icon="people-outline" title="No customers found" message="Customers matching this search will appear here." />
        )}

        {visibleCustomers.map((customer) => (
          <TouchableOpacity
            key={customer.id}
            className="border border-gray-100 rounded-lg p-4 mb-3"
            onPress={() => navigation.navigate("CustomerDetail", { customerId: customer.id, customer })}
          >
            <View className="flex-row justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-ink font-extrabold">{customer.name || "Name not set"}</Text>
                <Text className="text-muted mt-1">{customer.phone || "Phone not set"}</Text>
              </View>
              <Text className="text-primary font-extrabold">{money(customer.wallet_balance)}</Text>
            </View>

            <View className="flex-row flex-wrap mt-3">
              <Text className="bg-wash text-primary font-bold px-3 py-1 rounded-md mr-2 mb-2">Orders {customer.total_orders || 0}</Text>
              <Text className="bg-green-100 text-green-700 font-bold px-3 py-1 rounded-md mr-2 mb-2">Active subs {customer.active_subscriptions || 0}</Text>
              <Text className="bg-orange-100 text-orange-700 font-bold px-3 py-1 rounded-md mr-2 mb-2">Pending {customer.pending_orders || 0}</Text>
            </View>

            <Text className="text-muted mt-1">Spent: {money(customer.total_spent)}</Text>
            <Text className="text-muted mt-1">Last order: {customer.last_order_at ? dateTime(customer.last_order_at) : "No orders yet"}</Text>
            <Text className="text-muted mt-2" numberOfLines={2}>{addressText(customer)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

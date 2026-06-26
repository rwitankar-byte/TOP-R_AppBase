import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId, statusClass } from "../utils/format";

function orderTypeLabel(order) {
  const type = order.order_type || order.type || "regular";
  if (type === "subscription") return "Subscription Started";
  if (type === "refill") return "Refill";
  if (type === "return") return "Return";
  return "Product Order";
}

function addressLines(address) {
  if (!address) return ["No address saved"];
  return [
    `${address.label || "Address"}${address.is_default ? " • Default" : ""}`,
    address.full_address,
    address.landmark ? `Landmark: ${address.landmark}` : null,
    [address.area, address.city, address.pincode].filter(Boolean).join(", ")
  ].filter(Boolean);
}

function itemSummary(order) {
  const items = order.order_items || [];
  if (!items.length) return "No items";
  return items
    .map((item) => `${item.products?.name || item.product_id} x ${item.quantity}`)
    .join(", ");
}

function SummaryCard({ label, value }) {
  return (
    <View className="w-1/2 pr-2 mb-3">
      <View className="bg-wash rounded-lg p-3">
        <Text className="text-muted text-xs font-bold">{label}</Text>
        <Text className="text-ink font-extrabold text-lg mt-1">{value}</Text>
      </View>
    </View>
  );
}

function SectionTitle({ children }) {
  return <Text className="text-ink font-extrabold text-lg mt-5 mb-3">{children}</Text>;
}

export default function CustomerDetailScreen({ navigation, route }) {
  const customerId = route.params?.customerId || route.params?.customer?.id;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCustomer = useCallback(async ({ showLoading = true } = {}) => {
    if (!customerId) return;
    if (showLoading) setLoading(true);
    try {
      setDetail(await api.getCustomer(customerId));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Customer detail", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [customerId]);

  useFocusEffect(useCallback(() => {
    loadCustomer();
  }, [loadCustomer]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCustomer({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const user = detail?.user || route.params?.customer || {};
  const summary = detail?.summary || {};
  const addresses = detail?.addresses || [];
  const subscriptions = detail?.subscriptions || [];
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "Active");
  const orders = detail?.orders || [];
  const payments = detail?.payments || [];
  const transactions = detail?.transactions || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <ScreenHeader title="Customer Detail" subtitle={user.phone || "Customer"} onBack={navigation.goBack} />
        {loading && <LoadingState message="Loading customer details..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={() => loadCustomer()} /> : null}

        {!loading && !errorMessage && !detail && <EmptyState icon="person-outline" title="Customer details unavailable" message="Pull to refresh or try again later." />}
        {detail && !errorMessage && (
          <>
            <SectionTitle>Profile</SectionTitle>
            <View className="border border-gray-100 rounded-lg p-4 mb-2">
              <Text className="text-ink font-extrabold text-lg">{user.name || "Name not set"}</Text>
              <Text className="text-muted mt-1">{user.phone || "Phone not set"}</Text>
              <Text className="text-primary font-extrabold mt-2">Wallet {money(detail.wallet_balance)}</Text>
              <View className="mt-3">
                {addressLines(detail.default_address).map((line) => (
                  <Text key={line} className="text-muted mb-1">{line}</Text>
                ))}
              </View>
            </View>

            <SectionTitle>Business Summary</SectionTitle>
            <View className="flex-row flex-wrap">
              <SummaryCard label="Total orders" value={summary.total_orders || 0} />
              <SummaryCard label="Active subscriptions" value={summary.active_subscriptions || 0} />
              <SummaryCard label="Pending orders" value={summary.pending_orders || 0} />
              <SummaryCard label="Total spent" value={money(summary.total_spent)} />
              <SummaryCard label="Refundable deposit" value={money(detail.refundable_deposit_total)} />
              <SummaryCard label="Jars with customer" value={detail.jars_currently_with_customer || 0} />
            </View>

            <SectionTitle>Active Subscriptions</SectionTitle>
            {activeSubscriptions.length === 0 && <EmptyState icon="repeat-outline" title="No active subscriptions" message="This customer does not currently have an active subscription." />}
            {activeSubscriptions.map((subscription) => (
              <TouchableOpacity
                key={subscription.id}
                className="border border-gray-100 rounded-lg p-4 mb-3"
                onPress={() => navigation.navigate("SubscriptionDetail", { subscription: { ...subscription, users: user } })}
              >
                <View className="flex-row justify-between items-center">
                  <Text className="text-ink font-extrabold flex-1 pr-2">{subscription.products?.name || "Water Jar"}</Text>
                  <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(subscription.status)}`}>{subscription.status}</Text>
                </View>
                <Text className="text-muted mt-2">Jar count: {subscription.jar_count || subscription.quantity || 0}</Text>
                <Text className="text-muted mt-1">Frequency: {subscription.frequency || "On demand"}</Text>
                <Text className="text-primary font-extrabold mt-2">
                  Deposit {money(subscription.jar_deposit)} • Water charge {money(subscription.water_charge_per_delivery)}
                </Text>
              </TouchableOpacity>
            ))}

            <SectionTitle>Recent Orders</SectionTitle>
            {orders.length === 0 && <EmptyState icon="receipt-outline" title="No orders yet" message="This customer's order history will appear here." />}
            {orders.slice(0, 8).map((order) => (
              <TouchableOpacity
                key={order.id}
                className="border border-gray-100 rounded-lg p-4 mb-3"
                onPress={() => navigation.navigate("OrderDetail", { order: { ...order, users: user } })}
              >
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
                    <Text className="text-muted mt-1">{orderTypeLabel(order)}</Text>
                  </View>
                  <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(order.status)}`}>{order.status}</Text>
                </View>
                <Text className="text-primary font-extrabold mt-2">{money(order.total_amount)}</Text>
                <Text className="text-muted mt-1">{dateTime(order.created_at)}</Text>
                <Text className="text-muted mt-1" numberOfLines={2}>{itemSummary(order)}</Text>
              </TouchableOpacity>
            ))}

            <SectionTitle>Payments / Transactions</SectionTitle>
            {payments.length === 0 && transactions.length === 0 && <Text className="text-muted">No payments or wallet transactions.</Text>}
            {payments.slice(0, 6).map((payment) => (
              <View key={payment.id} className="border border-gray-100 rounded-lg p-4 mb-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-ink font-extrabold">{payment.description || "Payment"}</Text>
                  <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(payment.status)}`}>{payment.status}</Text>
                </View>
                <Text className="text-primary font-extrabold mt-2">{money(payment.amount)}</Text>
                <Text className="text-muted mt-1">{payment.method || "Unknown method"} • {dateTime(payment.created_at)}</Text>
              </View>
            ))}
            {transactions.slice(0, 6).map((transaction) => (
              <View key={transaction.id} className="border border-gray-100 rounded-lg p-4 mb-3">
                <Text className="text-ink font-extrabold">{transaction.description || transaction.type || "Wallet transaction"}</Text>
                <Text className="text-primary font-extrabold mt-2">{money(transaction.amount)}</Text>
                <Text className="text-muted mt-1">{transaction.type || "transaction"} • {dateTime(transaction.created_at)}</Text>
              </View>
            ))}

            <SectionTitle>Addresses</SectionTitle>
            {addresses.length === 0 && <Text className="text-muted">No addresses saved.</Text>}
            {addresses.map((address) => (
              <View key={address.id} className="border border-gray-100 rounded-lg p-4 mb-3">
                {addressLines(address).map((line) => (
                  <Text key={line} className={line.includes("Default") ? "text-primary font-extrabold mb-1" : "text-muted mb-1"}>{line}</Text>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

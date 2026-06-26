import { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { money } from "../utils/format";

function Card({ label, value, tone = "primary" }) {
  const bg = tone === "success" ? "bg-green-50 border-green-100" : tone === "alert" ? "bg-red-50 border-red-100" : "bg-wash border-gray-100";
  const text = tone === "success" ? "text-green-700" : tone === "alert" ? "text-red-600" : "text-primary";
  return (
    <View className="w-1/2 pr-2 mb-3">
      <View className={`border ${bg} rounded-lg p-4 min-h-[94px]`}>
        <Text className="text-muted text-xs font-bold">{label}</Text>
        <Text className={`${text} text-xl font-extrabold mt-2`}>{value}</Text>
      </View>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View className="mb-5">
      <Text className="text-ink font-extrabold text-lg mb-3">{title}</Text>
      {children}
    </View>
  );
}

export default function AnalyticsScreen({ navigation }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAnalytics = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      setAnalytics(await api.getAnalytics());
      setErrorMessage("");
    } catch (error) {
      setAnalytics(null);
      setErrorMessage(error.message || "Analytics failed to load.");
      Alert.alert("Analytics", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadAnalytics();
  }, [loadAnalytics]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAnalytics({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <ScreenHeader title="Analytics" subtitle="Business performance" onBack={navigation.goBack} />
        {loading && <LoadingState message="Loading analytics..." />}
        {!loading && errorMessage ? <ErrorState title="Analytics unavailable" message={errorMessage} onRetry={() => loadAnalytics()} /> : null}

        {analytics && (
          <>
            <Section title="Revenue">
              <View className="flex-row flex-wrap">
                <Card label="Today" value={money(analytics.revenue.today)} tone="success" />
                <Card label="This Week" value={money(analytics.revenue.week)} tone="success" />
                <Card label="This Month" value={money(analytics.revenue.month)} tone="success" />
                <Card label="All Time" value={money(analytics.revenue.allTime)} tone="success" />
              </View>
            </Section>

            <Section title="Orders">
              <View className="flex-row flex-wrap">
                <Card label="Today" value={analytics.orders.today} />
                <Card label="This Week" value={analytics.orders.week} />
                <Card label="This Month" value={analytics.orders.month} />
                <Card label="All Time" value={analytics.orders.allTime} />
                <Card label="Delivered" value={analytics.orders.delivered} tone="success" />
                <Card label="Cancelled" value={analytics.orders.cancelled} tone={analytics.orders.cancelled ? "alert" : "primary"} />
              </View>
            </Section>

            <Section title="Subscriptions & Customers">
              <View className="flex-row flex-wrap">
                <Card label="Active Subscriptions" value={analytics.subscriptions.active} tone="success" />
                <Card label="Paused Subscriptions" value={analytics.subscriptions.paused} />
                <Card label="Cancelled Subscriptions" value={analytics.subscriptions.cancelled} tone={analytics.subscriptions.cancelled ? "alert" : "primary"} />
                <Card label="New Subs This Month" value={analytics.subscriptions.newThisMonth} />
                <Card label="New Customers This Month" value={analytics.customers.newThisMonth} />
                <Card label="Repeat Customers" value={analytics.customers.repeatCustomers} tone="success" />
              </View>
            </Section>

            <Section title="Products">
              <Text className="text-ink font-bold mb-2">Top selling products</Text>
              {analytics.products.topSelling.length === 0 && <EmptyState icon="stats-chart-outline" title="No product sales yet" message="Top-selling products will appear after orders are placed." />}
              {analytics.products.topSelling.map((product) => (
                <View key={product.product_id} className="border border-gray-100 rounded-lg p-4 mb-3">
                  <View className="flex-row justify-between">
                    <Text className="text-ink font-extrabold flex-1 pr-3">{product.name}</Text>
                    <Text className="text-primary font-extrabold">{product.quantity_sold}</Text>
                  </View>
                  <Text className="text-muted mt-1">{product.unit || "Units"} sold • {money(product.revenue)} value</Text>
                </View>
              ))}

              <Text className="text-ink font-bold mt-2 mb-2">Low stock products</Text>
              {analytics.products.lowStock.length === 0 && <EmptyState icon="cube-outline" title="No low stock products" message="Inventory is currently above the low-stock threshold." />}
              {analytics.products.lowStock.map((product) => (
                <View key={product.product_id} className="bg-red-50 border border-red-100 rounded-lg p-4 mb-3">
                  <View className="flex-row justify-between">
                    <Text className="text-red-700 font-extrabold flex-1 pr-3">{product.name}</Text>
                    <Text className="text-red-600 font-extrabold">{product.quantity_available}</Text>
                  </View>
                  <Text className="text-red-600 mt-1">{product.unit || "Units"} available</Text>
                </View>
              ))}
            </Section>

            <Section title="Payments">
              <View className="flex-row flex-wrap">
                <Card label="Paid" value={money(analytics.payments.paid)} tone="success" />
                <Card label="Pending" value={money(analytics.payments.pending)} tone={analytics.payments.pending ? "alert" : "primary"} />
                <Card label="Refunds" value={money(analytics.payments.refunds)} tone={analytics.payments.refunds ? "alert" : "primary"} />
              </View>
            </Section>
          </>
        )}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}

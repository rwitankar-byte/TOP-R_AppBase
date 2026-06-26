import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { money } from "../utils/format";

function SummaryCard({ label, value, tone = "primary", onPress, suffix }) {
  const bg = tone === "alert" ? "bg-red-50 border-red-100" : tone === "success" ? "bg-green-50 border-green-100" : "bg-wash border-gray-100";
  const text = tone === "alert" ? "text-red-600" : tone === "success" ? "text-green-700" : "text-primary";
  const content = (
    <View className={`border ${bg} rounded-lg p-4 flex-1 mx-1 mb-3 min-h-[96px]`}>
      <Text className="text-muted text-xs font-bold">{label}</Text>
      <Text className={`${text} text-2xl font-extrabold mt-2`}>{value}</Text>
      {suffix ? <Text className="text-muted text-xs mt-1">{suffix}</Text> : null}
    </View>
  );
  return onPress ? <TouchableOpacity className="flex-1" onPress={onPress}>{content}</TouchableOpacity> : content;
}

function Section({ title, children }) {
  return (
    <View className="mb-5">
      <Text className="text-ink font-extrabold text-lg mb-3">{title}</Text>
      {children}
    </View>
  );
}

function CardRow({ children }) {
  return <View className="flex-row">{children}</View>;
}

export default function DashboardScreen({ navigation, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [devToolsEnabled, setDevToolsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isFocused = useIsFocused();
  const inFlightRequest = useRef(null);

  const loadData = useCallback(async ({ showLoading = true, silent = false } = {}) => {
    if (inFlightRequest.current) return inFlightRequest.current;
    const request = (async () => {
      if (showLoading) setLoading(true);
      try {
        const [summaryData, devToolsStatus] = await Promise.all([
          api.getDashboardSummary(),
          api.getDevToolsStatus().catch(() => ({ enabled: false }))
        ]);
        setSummary(summaryData);
        setDevToolsEnabled(Boolean(devToolsStatus.enabled));
        setErrorMessage("");
      } catch (error) {
        setSummary(null);
        setErrorMessage(error.message || "Dashboard summary failed to load.");
        if (!silent) Alert.alert("Dashboard", error.message);
      } finally {
        if (showLoading) setLoading(false);
        inFlightRequest.current = null;
      }
    })();
    inFlightRequest.current = request;
    return request;
  }, []);

  useEffect(() => {
    if (!isFocused) return undefined;
    loadData();
    const interval = setInterval(() => loadData({ showLoading: false, silent: true }), 15000);
    return () => clearInterval(interval);
  }, [isFocused, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const goOrders = (filter) => navigation.navigate("Orders", filter ? { filter } : undefined);
  const lowStockNames = summary?.inventory.lowStockItems
    .map((item) => `${item.name} (${item.quantity_available})`)
    .join(", ");

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <ScreenHeader title="Dashboard" subtitle="TOP-R Water operations" rightAction={onLogout} rightIcon="log-out" />
        {loading ? (
          <ActivityIndicator color="#00B5B0" />
        ) : errorMessage ? (
          <View className="bg-red-50 border border-red-100 rounded-lg p-4">
            <Text className="text-red-700 font-extrabold">Dashboard unavailable</Text>
            <Text className="text-red-600 mt-2">{errorMessage}</Text>
            <TouchableOpacity className="bg-red-500 rounded-lg py-3 items-center mt-4" onPress={() => loadData()}>
              <Text className="text-white font-extrabold">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : summary ? (
          <>
            <Section title="Today Summary">
              <CardRow>
                <SummaryCard label="Today Orders" value={summary.today.orders} onPress={() => goOrders()} />
                <SummaryCard label="Delivered Today" value={summary.today.delivered} tone="success" onPress={() => goOrders("Delivered")} />
              </CardRow>
              <CardRow>
                <SummaryCard label="Pending Orders" value={summary.today.pending} tone={summary.today.pending ? "alert" : "primary"} onPress={() => goOrders("Placed")} />
                <SummaryCard label="Today Revenue" value={money(summary.today.revenue)} tone="success" />
              </CardRow>
            </Section>

            <Section title="Operations">
              <CardRow>
                <SummaryCard label="Placed Orders" value={summary.orders.placed} onPress={() => goOrders("Placed")} />
                <SummaryCard label="Confirmed Orders" value={summary.orders.confirmed} onPress={() => goOrders("Confirmed")} />
              </CardRow>
              <CardRow>
                <SummaryCard label="Assigned Orders" value={summary.orders.assigned} onPress={() => goOrders("Assigned")} />
                <SummaryCard label="Picked Up Orders" value={summary.orders.pickedUp} onPress={() => goOrders("Picked Up")} />
              </CardRow>
              <CardRow>
                <SummaryCard label="Pending Return Requests" value={summary.subscriptions.cancellationRequested + summary.subscriptions.returnPending} tone={summary.subscriptions.cancellationRequested + summary.subscriptions.returnPending ? "alert" : "primary"} onPress={() => navigation.navigate("ReturnRequests")} />
                <SummaryCard label="Unassigned Confirmed Orders" value={summary.delivery.unassignedConfirmedOrders} tone={summary.delivery.unassignedConfirmedOrders ? "alert" : "primary"} onPress={() => goOrders("Confirmed")} />
              </CardRow>
            </Section>

            <Section title="Delivery">
              <CardRow>
                <SummaryCard label="Active Delivery Boys" value={summary.delivery.activeDeliveryBoys} onPress={() => navigation.navigate("DeliveryBoys")} />
                <SummaryCard label="Assigned Orders" value={summary.delivery.assignedOrders} onPress={() => goOrders("Assigned")} />
              </CardRow>
            </Section>

            <Section title="Inventory">
              <CardRow>
                <SummaryCard label="Low Stock Items" value={summary.inventory.lowStockCount} tone={summary.inventory.lowStockCount ? "alert" : "primary"} onPress={() => navigation.navigate("Inventory")} />
                <View className="flex-1 mx-1 mb-3" />
              </CardRow>
              {summary.inventory.lowStockCount > 0 && (
                <TouchableOpacity className="bg-red-50 border border-red-100 rounded-lg p-4" onPress={() => navigation.navigate("Inventory")}>
                  <Text className="text-red-700 font-extrabold mb-1">Low inventory</Text>
                  <Text className="text-red-600">{lowStockNames}</Text>
                </TouchableOpacity>
              )}
            </Section>

            <Section title="Payments">
              <CardRow>
                <SummaryCard label="Paid Today" value={money(summary.payments.paidToday)} tone="success" />
                <SummaryCard label="Pending Due" value={money(summary.payments.pendingDue)} tone={summary.payments.pendingDue ? "alert" : "primary"} />
              </CardRow>
              <CardRow>
                <SummaryCard label="Refunds Today" value={money(summary.payments.walletRefundsToday)} tone={summary.payments.walletRefundsToday ? "alert" : "primary"} />
                <View className="flex-1 mx-1 mb-3" />
              </CardRow>
            </Section>

            <Section title="Quick Actions">
              {[
                ["View Orders", "Orders", "receipt"],
                ["Analytics", "Analytics", "stats-chart"],
                ["Return Requests", "ReturnRequests", "archive"],
                ["View Subscriptions", "Subscriptions", "repeat"],
                ["Manage Inventory", "Inventory", "cube"],
                ["Delivery Boys", "DeliveryBoys", "bicycle"],
                ["Delivery Boy Login", "DeliveryLogin", "car"],
                ...(devToolsEnabled ? [["Dev Tools", "DevTools", "construct"]] : [])
              ].map(([label, route, icon]) => (
                <TouchableOpacity
                  key={route}
                  className="border border-gray-100 rounded-lg p-4 mb-3 flex-row items-center justify-between"
                  onPress={() => navigation.navigate(route)}
                >
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-lg bg-primary items-center justify-center mr-3">
                      <Ionicons name={icon} size={20} color="#fff" />
                    </View>
                    <Text className="text-ink font-bold">{label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#17252A" />
                </TouchableOpacity>
              ))}
            </Section>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

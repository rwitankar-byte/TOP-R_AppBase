import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";

function SummaryCard({ label, value, tone = "primary", onPress }) {
  const bg = tone === "alert" ? "bg-red-50 border-red-100" : "bg-wash border-gray-100";
  const text = tone === "alert" ? "text-red-600" : "text-primary";
  const content = (
    <View className={`border ${bg} rounded-lg p-4 flex-1 mx-1 mb-3`}>
      <Text className="text-muted text-xs">{label}</Text>
      <Text className={`${text} text-3xl font-extrabold mt-2`}>{value}</Text>
    </View>
  );
  return onPress ? <TouchableOpacity className="flex-1" onPress={onPress}>{content}</TouchableOpacity> : content;
}

export default function DashboardScreen({ navigation, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const inFlightRequest = useRef(null);

  const loadData = useCallback(async ({ showLoading = true, silent = false } = {}) => {
    if (inFlightRequest.current) return inFlightRequest.current;
    const request = (async () => {
      if (showLoading) setLoading(true);
      try {
        const [orderData, returnData, subscriptionData, inventoryData] = await Promise.all([
          api.getOrders(),
          api.getReturnRequests(),
          api.getSubscriptions("Active"),
          api.getInventory()
        ]);
        setOrders(orderData);
        setReturnRequests(returnData);
        setSubscriptions(subscriptionData);
        setInventory(inventoryData);
      } catch (error) {
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

  const today = new Date().toISOString().slice(0, 10);
  const todaysOrders = orders.filter((order) => order.created_at?.slice(0, 10) === today).length;
  const pendingOrders = orders.filter((order) => order.status === "Placed" || order.status === "Confirmed").length;
  const lowStock = inventory.filter((item) => Number(item.quantity_available) < 50);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <ScreenHeader title="Dashboard" subtitle="TOP-R Water operations" rightAction={onLogout} rightIcon="log-out" />
        {loading ? (
          <ActivityIndicator color="#00B5B0" />
        ) : (
          <>
            <View className="flex-row">
              <SummaryCard label="Today's orders" value={todaysOrders} />
              <SummaryCard label="Pending orders" value={pendingOrders} />
            </View>
            <View className="flex-row">
              <SummaryCard label="Active subscriptions" value={subscriptions.length} />
              <SummaryCard label="Pending Return Requests" value={returnRequests.length} tone={returnRequests.length ? "alert" : "primary"} onPress={() => navigation.navigate("ReturnRequests")} />
            </View>
            <View className="flex-row">
              <SummaryCard label="Low stock alerts" value={lowStock.length} tone={lowStock.length ? "alert" : "primary"} />
              <View className="flex-1 mx-1 mb-3" />
            </View>

            {lowStock.length > 0 && (
              <View className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
                <Text className="text-red-600 font-extrabold mb-1">Low inventory</Text>
                <Text className="text-red-600">
                  {lowStock.map((item) => item.products?.name || item.product_id).join(", ")}
                </Text>
              </View>
            )}

            <Text className="text-ink font-extrabold text-lg mb-3">Quick actions</Text>
            {[
              ["View Orders", "Orders", "receipt"],
              ["Return Requests", "ReturnRequests", "archive"],
              ["View Subscriptions", "Subscriptions", "repeat"],
              ["Manage Inventory", "Inventory", "cube"],
              ["Delivery Boys", "DeliveryBoys", "bicycle"],
              ["Delivery Mode", "DeliveryLogin", "car"]
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

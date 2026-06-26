import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { dateTime, money, shortId } from "../utils/format";

const filters = [
  { label: "All", kind: "all" },
  { label: "Placed", kind: "status", value: "Placed" },
  { label: "Confirmed", kind: "status", value: "Confirmed" },
  { label: "Assigned", kind: "status", value: "Assigned" },
  { label: "Picked Up", kind: "status", value: "Picked Up" },
  { label: "Delivered", kind: "status", value: "Delivered" },
  { label: "Cancelled", kind: "status", value: "Cancelled" },
  { label: "Subscription", kind: "type", value: "subscription" },
  { label: "Refill", kind: "type", value: "refill" },
  { label: "Return", kind: "type", value: "return" }
];

const sortOptions = ["Newest first", "Oldest first", "Highest amount", "Lowest amount"];

const typeLabels = {
  regular: "Product",
  delivery: "Product",
  subscription: "Subscription",
  refill: "Refill",
  return: "Return"
};

function orderType(order) {
  return order.type || order.order_type || "regular";
}

function orderTypeLabel(order) {
  return typeLabels[orderType(order)] || "Product";
}

function itemsText(order) {
  return (order.order_items || [])
    .map((item) => `${item.products?.name || item.product_id} x ${item.quantity}`)
    .join(", ");
}

function addressPreview(order) {
  const address = order.addresses?.full_address || "No address";
  return address.length > 68 ? `${address.slice(0, 65)}...` : address;
}

function statusClass(status) {
  return {
    Placed: "bg-orange-100 text-orange-700",
    Confirmed: "bg-blue-100 text-blue-700",
    Assigned: "bg-purple-100 text-purple-700",
    "Picked Up": "bg-teal-100 text-teal-700",
    Delivered: "bg-green-100 text-green-700",
    Cancelled: "bg-red-100 text-red-700",
    Returned: "bg-green-100 text-green-700",
    "Refund Completed": "bg-gray-200 text-gray-700"
  }[status] || "bg-gray-100 text-gray-700";
}

function typeClass(type) {
  return {
    subscription: "bg-yellow-100 text-yellow-800",
    refill: "bg-blue-100 text-blue-700",
    return: "bg-red-50 text-red-700"
  }[type] || "bg-wash text-primary";
}

function matchesSearch(order, rawSearch) {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;
  const haystack = [
    order.id,
    shortId(order.id),
    order.users?.phone,
    order.users?.name,
    order.addresses?.full_address,
    order.delivery_boys?.name,
    order.delivery_boys?.phone,
    orderType(order),
    orderTypeLabel(order),
    order.status,
    itemsText(order)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
}

export default function OrdersScreen({ navigation, route }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("Newest first");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const nextFilter = route.params?.initialFilter || route.params?.filter;
    if (nextFilter && filters.some((item) => item.label === nextFilter)) {
      setFilter(nextFilter);
      navigation.setParams({ filter: undefined, initialFilter: undefined });
    }
  }, [navigation, route.params?.filter, route.params?.initialFilter]);

  const loadOrders = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      setOrders(await api.getOrders());
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Orders", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadOrders({ showLoading: !orders.length });
  }, [loadOrders, orders.length]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrders({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const visibleOrders = useMemo(() => {
    const selectedFilter = filters.find((item) => item.label === filter) || filters[0];
    const filtered = orders.filter((order) => {
      if (selectedFilter.kind === "status" && order.status !== selectedFilter.value) return false;
      if (selectedFilter.kind === "type" && orderType(order) !== selectedFilter.value) return false;
      return matchesSearch(order, search);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "Oldest first") return new Date(a.created_at) - new Date(b.created_at);
      if (sort === "Highest amount") return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      if (sort === "Lowest amount") return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [filter, orders, search, sort]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <ScreenHeader title="Orders" subtitle={`${visibleOrders.length} shown of ${orders.length}`} rightAction={() => loadOrders({ showLoading: false })} />

        <View className="border border-gray-200 rounded-lg px-3 py-2 mb-3 flex-row items-center">
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            className="ml-2 flex-1 text-ink"
            value={search}
            onChangeText={setSearch}
            placeholder="Search order, customer, address, delivery boy"
            autoCapitalize="none"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          {filters.map((item) => (
            <TouchableOpacity
              key={item.label}
              className={`mr-2 px-4 py-3 rounded-md ${filter === item.label ? "bg-primary" : "bg-wash"}`}
              onPress={() => setFilter(item.label)}
            >
              <Text className={filter === item.label ? "text-white font-bold" : "text-ink font-bold"}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {sortOptions.map((item) => (
            <TouchableOpacity
              key={item}
              className={`mr-2 px-3 py-2 rounded-md border ${sort === item ? "bg-primary border-primary" : "bg-white border-gray-200"}`}
              onPress={() => setSort(item)}
            >
              <Text className={sort === item ? "text-white font-bold" : "text-muted font-bold"}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <LoadingState message="Loading orders..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={() => loadOrders()} /> : null}
        {!loading && !errorMessage && visibleOrders.length === 0 && (
          <EmptyState icon="receipt-outline" title="No orders found" message="Orders matching this view will appear here." />
        )}
        {visibleOrders.map((order) => {
          const type = orderType(order);
          return (
            <TouchableOpacity
              key={order.id}
              className="border border-gray-100 rounded-lg p-4 mb-3"
              onPress={() => navigation.navigate("OrderDetail", { order })}
            >
              <View className="flex-row justify-between items-start mb-3">
                <View className="flex-1 mr-2">
                  <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
                  <Text className="text-muted text-xs mt-1">{dateTime(order.created_at)}</Text>
                </View>
                <View className="items-end">
                  <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(order.status)}`}>{order.status}</Text>
                  <Text className={`px-3 py-1 rounded-md text-xs font-bold mt-2 ${typeClass(type)}`}>{orderTypeLabel(order)}</Text>
                </View>
              </View>

              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-ink font-bold">{order.users?.name || "Customer"}</Text>
                  <Text className="text-muted mt-1">{order.users?.phone || "Unknown phone"}</Text>
                </View>
                <Text className="text-primary text-xl font-extrabold">{money(order.total_amount)}</Text>
              </View>

              <Text className="text-muted mt-1">Address: {addressPreview(order)}</Text>
              {order.delivery_boys ? (
                <Text className="text-muted mt-1">Delivery boy: {order.delivery_boys.name}</Text>
              ) : (
                <Text className="text-muted mt-1">Delivery boy: Not assigned</Text>
              )}
              <Text className="text-muted mt-1">Items: {itemsText(order) || "No items"}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

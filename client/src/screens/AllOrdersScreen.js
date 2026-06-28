import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

const filters = ["All", "Orders", "Subscriptions", "Refills", "Returns", "Active/Pending", "Delivered"];
const activeStatuses = ["Placed", "Confirmed", "Assigned", "Picked Up"];
const statusClasses = {
  Placed: "bg-orange-100 text-orange-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Assigned: "bg-purple-100 text-purple-700",
  "Picked Up": "bg-teal-100 text-teal-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Returned: "bg-green-100 text-green-700",
  "Refund Completed": "bg-gray-200 text-gray-700"
};
const orderLabels = {
  regular: "Product Order",
  delivery: "Product Order",
  subscription: "Subscription Started",
  refill: "Refill Request",
  return: "Return Request"
};

function orderType(order) {
  return order.type || order.order_type || "regular";
}

function orderLabel(order) {
  return orderLabels[orderType(order)] || "Product Order";
}

function itemsText(order) {
  return (order.order_items || [])
    .map((item) => `${item.products?.name || item.product_id} x ${item.quantity}`)
    .join(", ");
}

function addressPreview(order) {
  const address = order.addresses?.full_address || "";
  if (!address) return "No delivery address";
  return address.length > 72 ? `${address.slice(0, 69)}...` : address;
}

function paymentStatus(order) {
  if (order.payment_method === "cash_on_delivery") return "Cash on Delivery";
  if (order.payments?.some((payment) => payment.status === "Paid")) return "Paid";
  if (order.payments?.some((payment) => payment.status === "Pending")) return "Pending";
  if (order.payments?.some((payment) => payment.status === "Failed")) return "Failed";
  if (order.payment_status) {
    return {
      pending: "Pending",
      paid: "Paid",
      failed: "Failed",
      refunded: "Refunded"
    }[order.payment_status] || order.payment_status;
  }
  if (!order.payments?.length) return null;
  return order.payments[0].status;
}

function matchesFilter(order, filter) {
  const type = orderType(order);
  if (filter === "Orders") return type === "regular" || type === "delivery";
  if (filter === "Subscriptions") return type === "subscription";
  if (filter === "Refills") return type === "refill";
  if (filter === "Returns") return type === "return";
  if (filter === "Active/Pending") return activeStatuses.includes(order.status);
  if (filter === "Delivered") return order.status === "Delivered";
  return true;
}

function matchesSearch(order, rawSearch) {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return true;
  return [
    order.id,
    orderLabel(order),
    orderType(order),
    order.status,
    order.delivery_boys?.name,
    order.delivery_boys?.phone,
    order.addresses?.full_address,
    order.addresses?.area,
    order.addresses?.city,
    itemsText(order)
  ].filter(Boolean).join(" ").toLowerCase().includes(search);
}

export default function AllOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadOrders = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const session = await getOrCreateMockSession();
      setOrders(await api.getOrders(session.user.id));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("All Orders", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadOrders({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const visibleOrders = useMemo(() => [...orders]
    .filter((order) => matchesFilter(order, filter) && matchesSearch(order, search))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), [filter, orders, search]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}>
        <Text className="text-ink text-2xl font-extrabold my-4">All Orders</Text>
        <View className="border border-gray-200 rounded-lg px-3 py-2 mb-3 flex-row items-center">
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput className="ml-2 flex-1 text-ink" value={search} onChangeText={setSearch} placeholder="Search orders, status, address, delivery boy" autoCapitalize="none" />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {filters.map((item) => (
            <TouchableOpacity key={item} className={`mr-2 px-4 py-3 rounded-md ${filter === item ? "bg-primary" : "bg-wash"}`} onPress={() => setFilter(item)}>
              <Text className={filter === item ? "text-white font-bold" : "text-ink font-bold"}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading && <LoadingState message="Loading orders..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={() => loadOrders()} /> : null}
        {!loading && !errorMessage && orders.length === 0 && (
          <EmptyState icon="receipt-outline" title="No orders yet" message="Place your first order to see it here." actionLabel="Browse Products" onAction={() => navigation.navigate("Products")} />
        )}
        {!loading && !errorMessage && orders.length > 0 && visibleOrders.length === 0 && (
          <EmptyState icon="search-outline" title="No orders match your filters" message="Try a different filter or search term." />
        )}
        {visibleOrders.map((order) => {
          const payStatus = paymentStatus(order);
          return (
            <TouchableOpacity key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3" onPress={() => navigation.navigate("OrderTracking", { orderId: order.id })}>
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <Text className="text-ink font-extrabold">#{order.id.slice(0, 8)}</Text>
                  <Text className="text-primary font-bold text-xs mt-1">{orderLabel(order)}</Text>
                  {order.source === "ivr" ? <Text className="text-purple-700 font-bold text-xs mt-1">Ordered by Phone</Text> : null}
                </View>
                <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClasses[order.status] || "bg-gray-100 text-gray-700"}`}>{order.status}</Text>
              </View>
              <Text className="text-muted mt-2">{new Date(order.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Text>
              <Text className="text-primary text-xl font-extrabold mt-2">₹{Number(order.total_amount || 0)}</Text>
              <Text className="text-muted mt-2">Address: {addressPreview(order)}</Text>
              <Text className="text-muted mt-1">Items: {itemsText(order) || "No items"}</Text>
              {order.delivery_boys ? <Text className="text-muted mt-1">Delivery: {order.delivery_boys.name} • {order.delivery_boys.phone}</Text> : null}
              {payStatus ? <Text className="text-ink font-bold mt-2">Payment: {payStatus}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

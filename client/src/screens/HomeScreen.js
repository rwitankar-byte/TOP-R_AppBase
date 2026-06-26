import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ProductCard from "../components/ProductCard";
import { banners, categories, products as fallbackProducts } from "../data/products";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

const activeStatuses = ["Placed", "Confirmed", "Assigned", "Picked Up"];

function orderLabel(order) {
  return {
    regular: "Product Order",
    delivery: "Product Order",
    subscription: "Subscription Started",
    refill: "Refill Request",
    return: "Return Request"
  }[order?.type || order?.order_type] || "Order";
}

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [locationLabel, setLocationLabel] = useState("Finding location...");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const popular = (products.length ? products : fallbackProducts).slice(0, 4);
  const latestActiveOrder = useMemo(() => orders
    .filter((order) => activeStatuses.includes(order.status))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0], [orders]);

  useEffect(() => {
    api.getProducts()
      .then((data) => {
        setProducts(data || []);
        setProductsError("");
      })
      .catch((error) => {
        setProductsError(error.message || "Unable to connect. Check your internet and try again.");
        Alert.alert("Products", error.message);
      })
      .finally(() => setProductsLoading(false));

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationLabel("Location permission needed");
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync(current.coords);
      setLocationLabel([place?.city || place?.district, place?.subregion || place?.region].filter(Boolean).join(", ") || "Current location");
    })().catch(() => setLocationLabel("Current location unavailable"));
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const session = await getOrCreateMockSession();
      setOrders(await api.getOrders(session.user.id));
    } catch {
      setOrders([]);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadOrders();
  }, [loadOrders]));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} className="px-4">
        <TouchableOpacity className="flex-row items-center justify-between py-3">
          <View className="flex-row items-center">
            <Ionicons name="location" color="#00B5B0" size={22} />
            <View className="ml-2">
              <Text className="text-xs text-muted">Deliver to</Text>
              <Text className="font-bold text-ink">{locationLabel}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" color="#17252A" size={20} />
        </TouchableOpacity>

        <View className="bg-wash rounded-lg px-4 py-3 flex-row items-center mb-4">
          <Ionicons name="search" color="#6B7280" size={20} />
          <TextInput className="ml-2 flex-1" placeholder="Search water jars, bottles, subscriptions" />
        </View>

        <FlatList
          horizontal
          pagingEnabled
          data={banners}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="w-80 mr-4 bg-primary rounded-lg p-5 min-h-36 justify-center">
              <Text className="text-white text-2xl font-extrabold">{item.title}</Text>
              <Text className="text-white mt-2">{item.subtitle}</Text>
            </View>
          )}
        />

        {latestActiveOrder && (
          <View className="border border-gray-100 rounded-lg p-4 mt-5">
            <Text className="text-muted text-xs">Track Latest Order</Text>
            <View className="flex-row justify-between items-start mt-1">
              <View className="flex-1 mr-3">
                <Text className="text-ink font-extrabold">{orderLabel(latestActiveOrder)}</Text>
                <Text className="text-muted mt-1">{latestActiveOrder.status} • ₹{Number(latestActiveOrder.total_amount || 0)}</Text>
              </View>
              <TouchableOpacity className="bg-primary rounded-md px-4 py-2" onPress={() => navigation.navigate("OrderTracking", { orderId: latestActiveOrder.id })}>
                <Text className="text-white font-bold">Track Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text className="text-ink font-extrabold text-xl mt-6 mb-3">Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity key={category} className="bg-wash border border-gray-100 rounded-lg px-4 py-3 mr-3">
              <Text className="text-ink font-bold">{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-ink font-extrabold text-xl">Most Popular Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Products")}>
            <Text className="text-primary font-bold">View all</Text>
          </TouchableOpacity>
        </View>
        {productsLoading && <LoadingState message="Loading products..." />}
        {!productsLoading && productsError ? <ErrorState message={productsError} onRetry={() => {
          setProductsLoading(true);
          api.getProducts().then((data) => {
            setProducts(data || []);
            setProductsError("");
          }).catch((error) => setProductsError(error.message || "Unable to connect. Check your internet and try again.")).finally(() => setProductsLoading(false));
        }} /> : null}
        <FlatList
          horizontal
          data={popular}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => <ProductCard product={item} compact />}
        />

        <TouchableOpacity
          className="bg-accent rounded-lg p-5 mt-6 mb-8"
          onPress={() => navigation.navigate("Subscriptions")}
        >
          <Text className="text-ink text-xl font-extrabold">Never run out of drinking water</Text>
          <Text className="text-ink mt-1">Set up daily, weekly, or custom 20L jar deliveries.</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

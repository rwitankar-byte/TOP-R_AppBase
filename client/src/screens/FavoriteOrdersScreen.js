import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

export default function FavoriteOrdersScreen({ navigation }) {
  const { addToCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateMockSession()
      .then((session) => api.getOrders(session.user.id))
      .then((data) => setOrders(data.slice(0, 3)))
      .catch((error) => Alert.alert("Quick Reorder", error.message))
      .finally(() => setLoading(false));
  }, []);

  const reorder = (order) => {
    (order.order_items || []).forEach((item) => {
      const product = item.products;
      if (!product) return;
      for (let count = 0; count < Number(item.quantity || 1); count += 1) {
        addToCart({ ...product, price: Number(item.unit_price || product.price) });
      }
    });
    Alert.alert("Added to cart", "Order items were added back to your cart.");
    navigation.navigate("MainTabs", { screen: "Cart" });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Quick Reorder</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && orders.length === 0 && <Text className="text-muted">No recent orders to reorder.</Text>}
        {orders.map((order) => (
          <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <Text className="font-extrabold text-ink">#{order.id.slice(0, 8)}</Text>
            <Text className="text-muted mt-1">{(order.order_items || []).length} items • ₹{Number(order.total_amount || 0)}</Text>
            <TouchableOpacity className="bg-primary rounded-lg py-3 items-center mt-3" onPress={() => reorder(order)}>
              <Text className="text-white font-bold">Reorder</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

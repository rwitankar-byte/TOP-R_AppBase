import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import { getOrCreateMockSession, getSelectedAddress } from "../services/session";

export default function CartScreen({ navigation }) {
  const { items, updateQuantity, total, clearCart } = useCart();
  const [session, setSession] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const address = selectedAddress || addresses.find((item) => item.is_default) || addresses[0];

  const loadAddresses = useCallback(async () => {
    try {
      const storedSession = await getOrCreateMockSession();
      setSession(storedSession);
      const savedAddress = await getSelectedAddress();
      setSelectedAddress(savedAddress);
      if (storedSession?.user?.id) {
        setAddresses(await api.getAddresses(storedSession.user.id));
      }
    } catch (error) {
      Alert.alert("Cart", error.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  const placeOrder = async () => {
    if (!items.length) {
      Alert.alert("Cart is empty", "Add a product before placing an order.");
      return;
    }
    const productItems = items.filter((item) => item.type !== "subscription");
    const subscriptionItems = items.filter((item) => item.type === "subscription");

    if (productItems.length && !address?.id) {
      Alert.alert("Address required", "No delivery address was found for this user.");
      return;
    }

    setPlacing(true);
    try {
      let order = null;
      if (productItems.length) {
        order = await api.placeOrder({
          user_id: session.user.id,
          address_id: address.id,
          total_amount: productItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
          items: productItems.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: Number(item.price)
          }))
        });
      }

      for (const item of subscriptionItems) {
        const subscription = await api.createSubscription({
          user_id: session.user.id,
          product_id: item.product_id,
          address_id: address?.id,
          frequency: item.frequency,
          start_date: item.start_date,
          jar_count: item.jar_count,
          status: "Pending"
        });
        await api.updateSubscription(subscription.id, { status: "Active" });
      }

      clearCart();
      if (order?.id) {
        navigation.navigate("OrderTracking", { orderId: order.id });
      } else {
        navigation.navigate("Subscriptions");
      }
    } catch (error) {
      Alert.alert("Checkout failed", error.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Cart</Text>
        <TouchableOpacity
          className="border border-gray-100 rounded-lg p-4 mb-4 flex-row items-center justify-between"
          onPress={() => navigation.navigate("AddressBook", { selectMode: true })}
        >
          <View>
            <Text className="text-xs text-muted">Delivery address</Text>
            <Text className="text-ink font-bold mt-1">{address ? `${address.label}, ${address.full_address}` : "No address found"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#17252A" />
        </TouchableOpacity>

        {items.map((item) => (
          <View key={item.id} className="flex-row border border-gray-100 rounded-lg p-3 mb-3">
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} className="w-20 h-20 rounded-md" />
            ) : (
              <View className="w-20 h-20 rounded-md bg-wash items-center justify-center">
                <Ionicons name={item.type === "subscription" ? "repeat" : "water"} size={28} color="#00B5B0" />
              </View>
            )}
            <View className="flex-1 ml-3">
              <Text className="font-bold text-ink">{item.name}</Text>
              {item.type === "subscription" && (
                <Text className="text-muted text-xs mt-1">
                  Deposit ₹{item.jar_deposit} + delivery ₹{item.water_charge_per_delivery}
                </Text>
              )}
              <Text className="text-primary font-extrabold mt-1">₹{Number(item.price)}</Text>
              {item.type === "subscription" ? (
                <TouchableOpacity className="bg-red-50 px-3 py-2 rounded-md mt-3 self-start" onPress={() => updateQuantity(item.id, 0)}>
                  <Text className="text-red-500 font-bold">Remove</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center mt-3">
                  <TouchableOpacity className="bg-wash p-2 rounded-md" onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Ionicons name="remove" size={18} color="#17252A" />
                  </TouchableOpacity>
                  <Text className="mx-4 font-bold">{item.quantity}</Text>
                  <TouchableOpacity className="bg-primary p-2 rounded-md" onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}

        <View className="border-t border-gray-100 pt-4 mt-2">
          <View className="flex-row justify-between mb-2">
            <Text className="text-muted">Subtotal</Text>
            <Text className="font-bold">₹{total}</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-muted">Delivery</Text>
            <Text className="font-bold">₹0</Text>
          </View>
          <View className="flex-row justify-between mb-5">
            <Text className="text-ink text-lg font-extrabold">Total amount</Text>
            <Text className="text-primary text-lg font-extrabold">₹{total}</Text>
          </View>
          <TouchableOpacity className="bg-primary rounded-lg py-4 items-center mb-4" onPress={placeOrder}>
            <Text className="text-white font-bold text-base">{placing ? "Placing..." : "Place Order"}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center mb-8" onPress={() => navigation.navigate("Payment")}>
            <Text className="text-primary font-bold">Go to payments</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

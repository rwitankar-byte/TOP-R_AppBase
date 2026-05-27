import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";

export default function CartScreen({ navigation }) {
  const { items, updateQuantity, total, clearCart } = useCart();

  const placeOrder = () => {
    if (!items.length) {
      Alert.alert("Cart is empty", "Add a product before placing an order.");
      return;
    }
    clearCart();
    navigation.navigate("OrderTracking", { orderId: "ORD-1024" });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Cart</Text>
        <TouchableOpacity className="border border-gray-100 rounded-lg p-4 mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xs text-muted">Delivery address</Text>
            <Text className="text-ink font-bold mt-1">Home, Andheri West, Mumbai</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#17252A" />
        </TouchableOpacity>

        {items.map((item) => (
          <View key={item.id} className="flex-row border border-gray-100 rounded-lg p-3 mb-3">
            <Image source={{ uri: item.image_url }} className="w-20 h-20 rounded-md" />
            <View className="flex-1 ml-3">
              <Text className="font-bold text-ink">{item.name}</Text>
              <Text className="text-primary font-extrabold mt-1">₹{item.price}</Text>
              <View className="flex-row items-center mt-3">
                <TouchableOpacity className="bg-wash p-2 rounded-md" onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                  <Ionicons name="remove" size={18} color="#17252A" />
                </TouchableOpacity>
                <Text className="mx-4 font-bold">{item.quantity}</Text>
                <TouchableOpacity className="bg-primary p-2 rounded-md" onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
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
            <Text className="text-white font-bold text-base">Place Order</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center mb-8" onPress={() => navigation.navigate("Payment")}>
            <Text className="text-primary font-bold">Go to payments</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

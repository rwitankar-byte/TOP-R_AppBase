import { useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product, compact = false }) {
  const { items, addToCart, updateQuantity } = useCart();
  const [imageFailed, setImageFailed] = useState(false);
  const cartItem = items.find((item) => item.type === "product" && item.id === product.id);
  const quantity = Number(cartItem?.quantity || 0);
  const imageHeightClass = compact ? "h-28 w-full" : "h-40 w-full";

  return (
    <View className={`bg-white border border-gray-100 rounded-lg overflow-hidden ${compact ? "w-48 mr-4" : "mb-4"}`}>
      {product.image_url && !imageFailed ? (
        <Image source={{ uri: product.image_url }} className={imageHeightClass} onError={() => setImageFailed(true)} />
      ) : (
        <View className={`${imageHeightClass} bg-wash items-center justify-center`}>
          <Ionicons name="water-outline" size={32} color="#00B5B0" />
        </View>
      )}
      <View className="p-3">
        <Text className="text-ink font-bold text-base" numberOfLines={2}>
          {product.name}
        </Text>
        <Text className="text-muted text-xs mt-1" numberOfLines={2}>
          {product.description}
        </Text>
        <View className="flex-row items-center justify-between mt-3">
          <View>
            <Text className="text-primary font-extrabold text-lg">₹{Number(product.price)}</Text>
            <Text className="text-muted text-xs">{product.unit}</Text>
          </View>
          {quantity > 0 ? (
            <View className="flex-row items-center border border-primary rounded-md overflow-hidden">
              <TouchableOpacity className="w-9 h-9 bg-primary items-center justify-center" onPress={() => updateQuantity(product.id, quantity - 1)}>
                <Ionicons name="remove" size={18} color="#fff" />
              </TouchableOpacity>
              <Text className="min-w-[42px] text-center text-ink font-extrabold">{quantity}</Text>
              <TouchableOpacity className="w-9 h-9 bg-primary items-center justify-center" onPress={() => updateQuantity(product.id, quantity + 1)}>
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              className="bg-primary px-3 py-2 rounded-md flex-row items-center"
              onPress={() => addToCart(product)}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="text-white font-bold ml-1">Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

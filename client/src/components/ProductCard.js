import { Image, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "../context/CartContext";

export default function ProductCard({ product, compact = false }) {
  const { addToCart } = useCart();

  return (
    <View className={`bg-white border border-gray-100 rounded-lg overflow-hidden ${compact ? "w-48 mr-4" : "mb-4"}`}>
      <Image source={{ uri: product.image_url }} className={compact ? "h-28 w-full" : "h-40 w-full"} />
      <View className="p-3">
        <Text className="text-ink font-bold text-base" numberOfLines={2}>
          {product.name}
        </Text>
        <Text className="text-muted text-xs mt-1" numberOfLines={2}>
          {product.description}
        </Text>
        <View className="flex-row items-center justify-between mt-3">
          <View>
            <Text className="text-primary font-extrabold text-lg">₹{product.price}</Text>
            <Text className="text-muted text-xs">{product.unit}</Text>
          </View>
          <TouchableOpacity
            className="bg-primary px-3 py-2 rounded-md flex-row items-center"
            onPress={() => addToCart(product)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text className="text-white font-bold ml-1">Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

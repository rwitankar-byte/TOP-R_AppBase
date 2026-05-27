import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProductCard from "../components/ProductCard";
import { products } from "../data/products";

export default function ProductsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white px-4">
      <Text className="text-ink text-2xl font-extrabold my-4">Products</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View className="h-6" />}
        renderItem={({ item }) => <ProductCard product={item} />}
      />
    </SafeAreaView>
  );
}

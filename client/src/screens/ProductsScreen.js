import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ProductCard from "../components/ProductCard";
import { api } from "../services/api";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts()
      .then(setProducts)
      .catch((error) => Alert.alert("Products", error.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white px-4">
      <Text className="text-ink text-2xl font-extrabold my-4">Products</Text>
      {loading && <ActivityIndicator color="#00B5B0" />}
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

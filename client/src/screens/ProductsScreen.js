import { useEffect, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ProductCard from "../components/ProductCard";
import { api } from "../services/api";

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProducts = () => {
    setLoading(true);
    setErrorMessage("");
    api.getProducts()
      .then((data) => {
        setProducts(data || []);
        setErrorMessage("");
      })
      .catch((error) => {
        setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
        Alert.alert("Products", error.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white px-4">
      <Text className="text-ink text-2xl font-extrabold my-4">Products</Text>
      {loading && <LoadingState message="Loading products..." />}
      {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={loadProducts} /> : null}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading && !errorMessage ? <EmptyState title="No products available" message="Please check again shortly." /> : null}
        ListFooterComponent={<View className="h-6" />}
        renderItem={({ item }) => <ProductCard product={item} />}
      />
    </SafeAreaView>
  );
}

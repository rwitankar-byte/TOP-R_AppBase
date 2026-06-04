import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";

export default function InventoryScreen() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const loadInventory = async () => {
    setLoading(true);
    try {
      setInventory(await api.getInventory());
    } catch (error) {
      Alert.alert("Inventory", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadInventory();
  }, []));

  const updateStock = async (item, delta) => {
    const nextQuantity = Math.max(0, Number(item.quantity_available || 0) + delta);
    setSavingId(item.product_id);
    try {
      const updated = await api.updateInventory(item.product_id, nextQuantity);
      setInventory((current) => current.map((stock) => (stock.product_id === item.product_id ? updated : stock)));
    } catch (error) {
      Alert.alert("Inventory update failed", error.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Inventory" subtitle="Current stock levels" rightAction={loadInventory} />
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && inventory.length === 0 && <Text className="text-muted">No inventory found.</Text>}
        {inventory.map((item) => {
          const lowStock = Number(item.quantity_available) < 50;
          return (
            <View
              key={item.id || item.product_id}
              className={`border rounded-lg p-4 mb-3 ${lowStock ? "border-red-100 bg-red-50" : "border-gray-100 bg-white"}`}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-ink font-extrabold">{item.products?.name || item.product_id}</Text>
                  <Text className={lowStock ? "text-red-600 mt-1" : "text-muted mt-1"}>
                    {lowStock ? "Low stock warning" : item.products?.unit || "units"}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    className="w-10 h-10 bg-primary rounded-lg items-center justify-center"
                    onPress={() => updateStock(item, -10)}
                    disabled={savingId === item.product_id}
                  >
                    <Text className="text-white text-xl font-extrabold">-</Text>
                  </TouchableOpacity>
                  <Text className="min-w-[64px] text-center text-primary text-xl font-extrabold">
                    {item.quantity_available}
                  </Text>
                  <TouchableOpacity
                    className="w-10 h-10 bg-primary rounded-lg items-center justify-center"
                    onPress={() => updateStock(item, 10)}
                    disabled={savingId === item.product_id}
                  >
                    <Text className="text-white text-xl font-extrabold">+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

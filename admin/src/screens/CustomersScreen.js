import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";
import { money } from "../utils/format";

export default function CustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      setCustomers(await api.getUsers());
    } catch (error) {
      Alert.alert("Customers", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadCustomers();
  }, []));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Customers" subtitle="User accounts and wallet balances" rightAction={loadCustomers} />
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && customers.length === 0 && <Text className="text-muted">No customers found.</Text>}
        {customers.map((customer) => (
          <TouchableOpacity
            key={customer.id}
            className="border border-gray-100 rounded-lg p-4 mb-3"
            onPress={() => navigation.navigate("CustomerDetail", { customer })}
          >
            <View className="flex-row justify-between">
              <View className="flex-1">
                <Text className="text-ink font-extrabold">{customer.phone}</Text>
                <Text className="text-muted mt-1">{customer.name || "Name not set"}</Text>
              </View>
              <Text className="text-primary font-extrabold">{money(customer.wallet_balance)}</Text>
            </View>
            <Text className="text-muted mt-2">Total orders: {(customer.orders || []).length}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

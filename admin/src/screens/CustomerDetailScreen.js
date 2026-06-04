import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { dateTime, money, shortId, statusClass } from "../utils/format";

export default function CustomerDetailScreen({ navigation, route }) {
  const { customer } = route.params;
  const orders = customer.orders || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Customer Detail" subtitle={customer.phone} onBack={navigation.goBack} />
        <View className="border border-gray-100 rounded-lg p-4 mb-5">
          <Text className="text-ink font-extrabold">{customer.name || "Name not set"}</Text>
          <Text className="text-muted mt-1">{customer.phone}</Text>
          <Text className="text-primary font-extrabold mt-2">Wallet {money(customer.wallet_balance)}</Text>
          <Text className="text-muted mt-1">Total orders: {orders.length}</Text>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Order history</Text>
        {orders.length === 0 && <Text className="text-muted">No orders yet.</Text>}
        {orders.map((order) => (
          <View key={order.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-ink font-extrabold">{shortId(order.id)}</Text>
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClass(order.status)}`}>{order.status}</Text>
            </View>
            <Text className="text-primary font-extrabold mt-2">{money(order.total_amount)}</Text>
            <Text className="text-muted mt-1">{dateTime(order.created_at)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const transactions = [
  { id: "pay-1", label: "20L RO Purified Jar", method: "UPI", amount: 160, status: "Paid" },
  { id: "pay-2", label: "Weekly subscription", method: "Wallet", amount: 240, status: "Paid" }
];

export default function PaymentScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <View className="bg-primary rounded-lg p-5 my-4">
          <Text className="text-white">Due amount</Text>
          <Text className="text-white text-4xl font-extrabold mt-2">₹320</Text>
          <TouchableOpacity className="bg-accent rounded-lg py-3 items-center mt-5">
            <Text className="text-ink font-extrabold">Pay Now</Text>
          </TouchableOpacity>
          <Text className="text-white text-xs mt-3">Razorpay / UPI integration placeholder</Text>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Transaction history</Text>
        {transactions.map((transaction) => (
          <View key={transaction.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <View className="flex-row justify-between">
              <Text className="font-bold text-ink">{transaction.label}</Text>
              <Text className="font-extrabold text-primary">₹{transaction.amount}</Text>
            </View>
            <Text className="text-muted mt-1">
              {transaction.method} • {transaction.status}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

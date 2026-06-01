import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getSession } from "../services/session";

export default function PaymentScreen() {
  const [due, setDue] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    getSession().then(async (storedSession) => {
      if (!storedSession?.user?.id) return;
      const [dueData, paymentData] = await Promise.all([
        api.getDue(storedSession.user.id),
        api.getPayments(storedSession.user.id)
      ]);
      setDue(Number(dueData.due_amount || 0));
      setTransactions(paymentData);
    }).catch((error) => Alert.alert("Payments", error.message));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <View className="bg-primary rounded-lg p-5 my-4">
          <Text className="text-white">Due amount</Text>
          <Text className="text-white text-4xl font-extrabold mt-2">₹{due}</Text>
          <TouchableOpacity className="bg-accent rounded-lg py-3 items-center mt-5">
            <Text className="text-ink font-extrabold">Pay Now</Text>
          </TouchableOpacity>
          <Text className="text-white text-xs mt-3">Razorpay / UPI integration placeholder</Text>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Transaction history</Text>
        {transactions.map((transaction) => (
          <View key={transaction.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <View className="flex-row justify-between">
              <Text className="font-bold text-ink">{transaction.method || "Payment"}</Text>
              <Text className="font-extrabold text-primary">₹{transaction.amount}</Text>
            </View>
            <Text className="text-muted mt-1">
              {transaction.status} • {new Date(transaction.created_at).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

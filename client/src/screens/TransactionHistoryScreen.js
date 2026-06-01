import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

const statusClasses = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-orange-100 text-orange-700",
  Failed: "bg-red-100 text-red-700",
  Refunded: "bg-blue-100 text-blue-700"
};

export default function TransactionHistoryScreen() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrCreateMockSession()
      .then((session) => api.getPayments(session.user.id))
      .then(setPayments)
      .catch((error) => Alert.alert("Transaction History", error.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Transaction History</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && payments.length === 0 && <Text className="text-muted">No transactions yet.</Text>}
        {payments.map((payment) => (
          <View key={payment.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-ink">{payment.description || payment.method || "Payment"}</Text>
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${statusClasses[payment.status] || "bg-gray-100 text-gray-700"}`}>
                {payment.status}
              </Text>
            </View>
            <Text className="text-primary font-extrabold mt-2">₹{Number(payment.amount || 0)}</Text>
            <Text className="text-muted mt-1">{payment.method} • {new Date(payment.created_at).toLocaleDateString()}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

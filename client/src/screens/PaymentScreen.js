import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import { api } from "../services/api";
import { getSession } from "../services/session";

export default function PaymentScreen() {
  const [due, setDue] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [session, setSession] = useState(null);
  const [paying, setPaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPayments = async () => {
    setLoading(true);
    try {
      const storedSession = await getSession();
      if (!storedSession?.user?.id) return;
      setSession(storedSession);
      const [dueData, paymentData] = await Promise.all([
        api.getDue(storedSession.user.id),
        api.getPayments(storedSession.user.id)
      ]);
      setDue(Number(dueData.due_amount || 0));
      setTransactions(paymentData);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Payments", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const payNow = async () => {
    if (!session?.user?.id) {
      Alert.alert("Session required", "Please continue as guest or login before making a payment.");
      return;
    }

    if (due <= 0) {
      Alert.alert("No dues", "There is no outstanding amount to pay.");
      return;
    }

    setPaying(true);
    try {
      const paymentOrder = await api.createRazorpayOrder({
        user_id: session.user.id,
        amount: Math.round(due * 100),
        currency: "INR",
        receipt: `due_${Date.now()}`,
        pay_due: true
      });

      const razorpayResult = await RazorpayCheckout.open({
        key: paymentOrder.key_id,
        order_id: paymentOrder.razorpay_order_id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "TOP-R Water",
        description: "Outstanding water jar dues",
        prefill: {
          contact: session.user.phone || session.profile?.phone || ""
        },
        theme: { color: "#00B5B0" }
      });

      const verified = await api.verifyRazorpayPayment({
        razorpay_order_id: razorpayResult.razorpay_order_id,
        razorpay_payment_id: razorpayResult.razorpay_payment_id,
        razorpay_signature: razorpayResult.razorpay_signature
      });

      if (!verified.success) {
        throw new Error("Payment verification failed");
      }

      Alert.alert("Payment successful", "Your payment has been recorded.");
      await loadPayments();
    } catch (error) {
      Alert.alert("Payment failed", "Payment failed. Try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        {loading && <LoadingState message="Loading payments..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={loadPayments} /> : null}
        {!loading && !errorMessage ? (
          <>
        <View className="bg-primary rounded-lg p-5 my-4">
          <Text className="text-white">Due amount</Text>
          <Text className="text-white text-4xl font-extrabold mt-2">₹{due}</Text>
          <TouchableOpacity className="bg-accent rounded-lg py-3 items-center mt-5" onPress={payNow} disabled={paying}>
            <Text className="text-ink font-extrabold">{paying ? "Processing..." : "Pay Now"}</Text>
          </TouchableOpacity>
          <Text className="text-white text-xs mt-3">Use Razorpay test card 4111 1111 1111 1111 for testing.</Text>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Transaction history</Text>
        {transactions.length === 0 && <EmptyState icon="card-outline" title="No transactions yet" message="Payments and refunds will appear here." />}
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
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

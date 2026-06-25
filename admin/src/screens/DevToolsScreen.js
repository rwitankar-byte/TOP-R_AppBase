import { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";

const CONFIRM_PHRASE = "DELETE TEST DATA";
const TEST_PHONE = "+919999999999";

function SummaryRow({ label, value }) {
  return (
    <View className="flex-row justify-between border-b border-gray-100 py-3">
      <Text className="text-muted">{label}</Text>
      <Text className="text-ink font-extrabold">{String(value)}</Text>
    </View>
  );
}

export default function DevToolsScreen({ navigation }) {
  const [phone, setPhone] = useState(TEST_PHONE);
  const [confirmText, setConfirmText] = useState("");
  const [pendingPhone, setPendingPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const openConfirm = (nextPhone) => {
    const cleanedPhone = nextPhone.trim();
    if (!cleanedPhone) {
      Alert.alert("Phone required", "Enter a customer phone before cleanup.");
      return;
    }
    setPendingPhone(cleanedPhone);
    setConfirmText("");
  };

  const cleanup = async () => {
    setLoading(true);
    try {
      const summary = await api.cleanupTestData(pendingPhone, confirmText);
      setResult(summary);
      setPendingPhone(null);
      Alert.alert("Cleanup complete", "Test customer data has been reset safely.");
    } catch (error) {
      Alert.alert("Cleanup failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Dev Tools" subtitle="Safe test customer cleanup" onBack={navigation.goBack} />

        <View className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
          <Text className="text-red-700 font-extrabold">Dev-only destructive action</Text>
          <Text className="text-red-600 mt-2">
            This only cleans the selected customer's orders, subscriptions, payments, transactions, and extra addresses.
          </Text>
        </View>

        <Text className="text-muted text-xs mb-2">Customer phone</Text>
        <TextInput
          className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+919999999999"
        />

        <TouchableOpacity className="bg-primary rounded-lg py-4 items-center mb-3" onPress={() => openConfirm(phone)}>
          <Text className="text-white font-extrabold">Clean Test Data</Text>
        </TouchableOpacity>

        <TouchableOpacity className="border border-primary rounded-lg py-4 items-center mb-6" onPress={() => openConfirm(TEST_PHONE)}>
          <Text className="text-primary font-extrabold">Reset Test Customer</Text>
        </TouchableOpacity>

        {result && (
          <View className="border border-gray-100 rounded-lg p-4 mb-6">
            <Text className="text-ink font-extrabold text-lg mb-2">Cleanup Summary</Text>
            <SummaryRow label="Orders deleted" value={result.ordersDeleted} />
            <SummaryRow label="Subscriptions deleted" value={result.subscriptionsDeleted} />
            <SummaryRow label="Payments deleted" value={result.paymentsDeleted} />
            <SummaryRow label="Transactions deleted" value={result.transactionsDeleted} />
            <SummaryRow label="Extra addresses deleted" value={result.addressesDeleted} />
            <SummaryRow label="Wallet reset" value={result.walletReset ? "Yes" : "No"} />
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(pendingPhone)} animationType="fade" onRequestClose={() => setPendingPhone(null)}>
        <View className="flex-1 bg-black/40 justify-center px-5">
          <View className="bg-white rounded-lg p-5">
            <Text className="text-ink text-xl font-extrabold">Confirm cleanup</Text>
            <Text className="text-muted mt-2">
              Type {CONFIRM_PHRASE} to clean test data for {pendingPhone}.
            </Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-base my-4"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              placeholder={CONFIRM_PHRASE}
            />
            <TouchableOpacity
              className={`rounded-lg py-4 items-center mb-3 ${confirmText === CONFIRM_PHRASE ? "bg-red-500" : "bg-gray-300"}`}
              onPress={cleanup}
              disabled={loading || confirmText !== CONFIRM_PHRASE}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-extrabold">Delete Test Data</Text>}
            </TouchableOpacity>
            <TouchableOpacity className="py-3 items-center" onPress={() => setPendingPhone(null)} disabled={loading}>
              <Text className="text-muted font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

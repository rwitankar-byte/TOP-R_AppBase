import { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";

const CLEANUP_CONFIRM_PHRASE = "DELETE TEST DATA";
const SEED_CONFIRM_PHRASE = "SEED DEMO DATA";
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
  const [pendingAction, setPendingAction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const openConfirm = (nextPhone) => {
    const cleanedPhone = nextPhone.trim();
    if (!cleanedPhone) {
      Alert.alert("Phone required", "Enter a customer phone before cleanup.");
      return;
    }
    setPendingAction({
      type: "cleanup",
      title: "Confirm cleanup",
      phrase: CLEANUP_CONFIRM_PHRASE,
      phone: cleanedPhone,
      description: `Type ${CLEANUP_CONFIRM_PHRASE} to clean test data for ${cleanedPhone}.`
    });
    setConfirmText("");
  };

  const openSeedConfirm = () => {
    setPendingAction({
      type: "seed",
      title: "Confirm demo seed",
      phrase: SEED_CONFIRM_PHRASE,
      description: `Type ${SEED_CONFIRM_PHRASE} to seed demo customer, delivery boys, products, and inventory.`
    });
    setConfirmText("");
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    setLoading(true);
    try {
      const summary =
        pendingAction.type === "seed"
          ? await api.seedDemoData(confirmText)
          : await api.cleanupTestData(pendingAction.phone, confirmText);
      setResult({ type: pendingAction.type, summary });
      setPendingAction(null);
      Alert.alert(pendingAction.type === "seed" ? "Demo data ready" : "Cleanup complete", pendingAction.type === "seed" ? "Demo data has been seeded safely." : "Test customer data has been reset safely.");
    } catch (error) {
      Alert.alert(pendingAction.type === "seed" ? "Seed failed" : "Cleanup failed", error.message);
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

        <TouchableOpacity className="bg-wash border border-primary rounded-lg py-4 items-center mb-6" onPress={openSeedConfirm}>
          <Text className="text-primary font-extrabold">Seed Demo Data</Text>
        </TouchableOpacity>

        {result && (
          <View className="border border-gray-100 rounded-lg p-4 mb-6">
            <Text className="text-ink font-extrabold text-lg mb-2">{result.type === "seed" ? "Seed Summary" : "Cleanup Summary"}</Text>
            {result.type === "seed" ? (
              <>
                <SummaryRow label="User ready" value={result.summary.userReady ? "Yes" : "No"} />
                <SummaryRow label="Default address ready" value={result.summary.defaultAddressReady ? "Yes" : "No"} />
                <SummaryRow label="Delivery boys ready" value={result.summary.deliveryBoysReady} />
                <SummaryRow label="Products ready" value={result.summary.productsReady} />
                <SummaryRow label="Inventory ready" value={result.summary.inventoryReady ? "Yes" : "No"} />
              </>
            ) : (
              <>
                <SummaryRow label="Orders deleted" value={result.summary.ordersDeleted} />
                <SummaryRow label="Subscriptions deleted" value={result.summary.subscriptionsDeleted} />
                <SummaryRow label="Payments deleted" value={result.summary.paymentsDeleted} />
                <SummaryRow label="Transactions deleted" value={result.summary.transactionsDeleted} />
                <SummaryRow label="Extra addresses deleted" value={result.summary.addressesDeleted} />
                <SummaryRow label="Wallet reset" value={result.summary.walletReset ? "Yes" : "No"} />
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={Boolean(pendingAction)} animationType="fade" onRequestClose={() => setPendingAction(null)}>
        <View className="flex-1 bg-black/40 justify-center px-5">
          <View className="bg-white rounded-lg p-5">
            <Text className="text-ink text-xl font-extrabold">{pendingAction?.title}</Text>
            <Text className="text-muted mt-2">{pendingAction?.description}</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-base my-4"
              value={confirmText}
              onChangeText={setConfirmText}
              autoCapitalize="characters"
              placeholder={pendingAction?.phrase}
            />
            <TouchableOpacity
              className={`rounded-lg py-4 items-center mb-3 ${confirmText === pendingAction?.phrase ? (pendingAction?.type === "seed" ? "bg-primary" : "bg-red-500") : "bg-gray-300"}`}
              onPress={runPendingAction}
              disabled={loading || confirmText !== pendingAction?.phrase}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-extrabold">{pendingAction?.type === "seed" ? "Seed Demo Data" : "Delete Test Data"}</Text>}
            </TouchableOpacity>
            <TouchableOpacity className="py-3 items-center" onPress={() => setPendingAction(null)} disabled={loading}>
              <Text className="text-muted font-bold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

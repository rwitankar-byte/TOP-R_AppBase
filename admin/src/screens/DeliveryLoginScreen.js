import { useCallback, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import LoadingState from "../components/LoadingState";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";

export default function DeliveryLoginScreen({ navigation }) {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDeliveryBoys = async () => {
    setLoading(true);
    try {
      setDeliveryBoys((await api.getDeliveryBoys()).filter((item) => item.is_active));
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(error.message || "Unable to connect. Check your internet and try again.");
      Alert.alert("Delivery login", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadDeliveryBoys();
  }, []));

  const chooseDeliveryBoy = (deliveryBoy) => {
    if (phone.trim() && !deliveryBoy.phone.includes(phone.replace(/\s/g, ""))) {
      Alert.alert("Phone does not match", "Choose the delivery boy matching this phone number.");
      return;
    }
    navigation.replace("DeliveryDashboard", { deliveryBoy });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <ScreenHeader title="Delivery Login" subtitle="Select your delivery profile" onBack={navigation.goBack} />
        <TextInput className="border border-gray-200 rounded-lg px-3 py-3 mb-4 text-ink" placeholder="Phone number (test mode)" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        {loading && <LoadingState message="Loading delivery profiles..." />}
        {!loading && errorMessage ? <ErrorState message={errorMessage} onRetry={loadDeliveryBoys} /> : null}
        {!loading && !errorMessage && deliveryBoys.length === 0 && (
          <EmptyState icon="person-outline" title="No active delivery boys" message="Ask the admin to activate a delivery profile first." />
        )}
        {deliveryBoys.map((deliveryBoy) => (
          <TouchableOpacity key={deliveryBoy.id} className="border border-gray-100 rounded-lg p-4 mb-3" onPress={() => chooseDeliveryBoy(deliveryBoy)}>
            <Text className="text-ink font-extrabold">{deliveryBoy.name}</Text>
            <Text className="text-muted mt-1">{deliveryBoy.phone}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

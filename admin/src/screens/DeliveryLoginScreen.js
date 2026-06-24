import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";

export default function DeliveryLoginScreen({ navigation }) {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDeliveryBoys = async () => {
    setLoading(true);
    try {
      setDeliveryBoys((await api.getDeliveryBoys()).filter((item) => item.is_active));
    } catch (error) {
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
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && deliveryBoys.length === 0 && <Text className="text-muted">No active delivery boys available.</Text>}
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

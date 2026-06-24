import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenHeader from "../components/ScreenHeader";
import { api } from "../services/api";

export default function DeliveryBoysScreen({ navigation }) {
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDeliveryBoys = async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      setDeliveryBoys(await api.getDeliveryBoys());
    } catch (error) {
      Alert.alert("Delivery Boys", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadDeliveryBoys();
  }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDeliveryBoys({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

  const addDeliveryBoy = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert("Missing details", "Enter a name and phone number.");
      return;
    }
    setSaving(true);
    try {
      await api.createDeliveryBoy({ name, phone });
      setName("");
      setPhone("");
      await loadDeliveryBoys({ showLoading: false });
    } catch (error) {
      Alert.alert("Could not add delivery boy", error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (deliveryBoy) => {
    try {
      await api.updateDeliveryBoy(deliveryBoy.id, { is_active: !deliveryBoy.is_active });
      await loadDeliveryBoys({ showLoading: false });
    } catch (error) {
      Alert.alert("Update failed", error.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}>
        <ScreenHeader title="Delivery Boys" subtitle="Manage delivery assignments" onBack={navigation.goBack} rightAction={loadDeliveryBoys} />
        <View className="border border-gray-100 rounded-lg p-4 mb-4">
          <Text className="text-ink font-extrabold mb-3">Add Delivery Boy</Text>
          <TextInput className="border border-gray-200 rounded-lg px-3 py-3 mb-3 text-ink" placeholder="Name" value={name} onChangeText={setName} />
          <TextInput className="border border-gray-200 rounded-lg px-3 py-3 mb-3 text-ink" placeholder="Phone number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TouchableOpacity className="bg-primary rounded-lg py-3 items-center" onPress={addDeliveryBoy} disabled={saving}>
            <Text className="text-white font-extrabold">{saving ? "Adding..." : "Add Delivery Boy"}</Text>
          </TouchableOpacity>
        </View>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && deliveryBoys.length === 0 && <Text className="text-muted">No delivery boys added yet.</Text>}
        {deliveryBoys.map((deliveryBoy) => (
          <View key={deliveryBoy.id} className="border border-gray-100 rounded-lg p-4 mb-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-ink font-extrabold">{deliveryBoy.name}</Text>
              <Text className={`px-3 py-1 rounded-md text-xs font-bold ${deliveryBoy.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{deliveryBoy.is_active ? "Active" : "Inactive"}</Text>
            </View>
            <Text className="text-muted mt-2">{deliveryBoy.phone}</Text>
            <TouchableOpacity className="bg-wash rounded-lg py-3 items-center mt-3" onPress={() => toggleActive(deliveryBoy)}>
              <Text className="text-ink font-bold">{deliveryBoy.is_active ? "Deactivate" : "Activate"}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

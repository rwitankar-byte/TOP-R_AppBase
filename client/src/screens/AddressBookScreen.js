import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getOrCreateMockSession, saveSelectedAddress } from "../services/session";

const labels = ["Home", "Work", "Other"];

export default function AddressBookScreen({ navigation, route }) {
  const selectMode = route.params?.selectMode === true;
  const [session, setSession] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [label, setLabel] = useState("Home");
  const [fullAddress, setFullAddress] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const storedSession = await getOrCreateMockSession();
      setSession(storedSession);
      setAddresses(await api.getAddresses(storedSession.user.id));
    } catch (error) {
      Alert.alert("Address Book", error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  const addAddress = async () => {
    if (!fullAddress.trim()) {
      Alert.alert("Address required", "Enter the full address before saving.");
      return;
    }

    setSaving(true);
    try {
      await api.addAddress({
        user_id: session.user.id,
        label,
        full_address: fullAddress.trim(),
        is_default: isDefault
      });
      setFullAddress("");
      setIsDefault(false);
      await loadAddresses();
    } catch (error) {
      Alert.alert("Save address failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = (address) => {
    Alert.alert("Delete address", `Remove ${address.label}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteAddress(address.id);
            await loadAddresses();
          } catch (error) {
            Alert.alert("Delete failed", error.message);
          }
        }
      }
    ]);
  };

  const setDefaultAddress = async (address) => {
    try {
      await api.updateAddress(address.id, { is_default: true });
      await loadAddresses();
    } catch (error) {
      Alert.alert("Default update failed", error.message);
    }
  };

  const pickAddress = async (address) => {
    if (!selectMode) return;
    await saveSelectedAddress(address);
    navigation.goBack();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Address Book</Text>

        <View className="border border-gray-100 rounded-lg p-4 mb-5">
          <Text className="text-ink font-extrabold text-lg mb-3">Add New Address</Text>
          <Text className="text-muted text-xs mb-2">Label</Text>
          <View className="flex-row mb-4">
            {labels.map((item) => (
              <TouchableOpacity
                key={item}
                className={`mr-2 px-4 py-3 rounded-md ${label === item ? "bg-primary" : "bg-wash"}`}
                onPress={() => setLabel(item)}
              >
                <Text className={label === item ? "text-white font-bold" : "text-ink font-bold"}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-muted text-xs mb-2">Full Address</Text>
          <TextInput
            className="border border-gray-200 rounded-lg px-4 py-3 text-base min-h-24 mb-4"
            multiline
            value={fullAddress}
            onChangeText={setFullAddress}
            placeholder="Flat, building, street, area, city"
          />

          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-bold text-ink">Set as default</Text>
            <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: "#00B5B0" }} />
          </View>

          <TouchableOpacity className="bg-primary rounded-lg py-4 items-center" onPress={addAddress} disabled={saving}>
            <Text className="text-white font-bold">{saving ? "Saving..." : "Save Address"}</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Saved Addresses</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && addresses.length === 0 && <Text className="text-muted">No saved addresses yet.</Text>}
        {addresses.map((address) => (
          <TouchableOpacity
            key={address.id}
            className="border border-gray-100 rounded-lg p-4 mb-3"
            onPress={() => pickAddress(address)}
            activeOpacity={selectMode ? 0.6 : 1}
          >
            <View className="flex-row justify-between items-center">
              <Text className="font-extrabold text-ink">{address.label}</Text>
              {address.is_default && <Text className="bg-accent px-3 py-1 rounded-md text-ink font-bold text-xs">Default</Text>}
            </View>
            <Text className="text-muted mt-2">{address.full_address}</Text>
            <View className="flex-row mt-4">
              {!address.is_default && (
                <TouchableOpacity className="bg-wash px-4 py-2 rounded-md mr-3" onPress={() => setDefaultAddress(address)}>
                  <Text className="text-ink font-bold">Set Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity className="bg-red-50 px-4 py-2 rounded-md" onPress={() => removeAddress(address)}>
                <Text className="text-red-500 font-bold">Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

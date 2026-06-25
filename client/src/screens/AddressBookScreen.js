import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getOrCreateMockSession, saveSelectedAddress } from "../services/session";

const labels = ["Home", "Office", "Other"];
const emptyForm = {
  label: "Home",
  full_address: "",
  landmark: "",
  area: "",
  city: "",
  pincode: "",
  lat: "",
  lng: "",
  is_default: false
};

function addressLines(address) {
  return [
    address.full_address,
    address.landmark ? `Landmark: ${address.landmark}` : null,
    [address.area, address.city, address.pincode].filter(Boolean).join(", ")
  ].filter(Boolean);
}

export default function AddressBookScreen({ navigation, route }) {
  const selectMode = route.params?.selectMode === true;
  const [session, setSession] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

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

  useFocusEffect(useCallback(() => {
    loadAddresses();
  }, [loadAddresses]));

  const payloadFromForm = () => ({
    user_id: session.user.id,
    label: form.label,
    full_address: form.full_address.trim(),
    landmark: form.landmark.trim() || null,
    area: form.area.trim() || null,
    city: form.city.trim() || null,
    pincode: form.pincode.trim() || null,
    lat: form.lat.trim() ? Number(form.lat) : null,
    lng: form.lng.trim() ? Number(form.lng) : null,
    is_default: form.is_default
  });

  const saveAddress = async () => {
    if (!form.full_address.trim()) {
      Alert.alert("Address required", "Enter the full address before saving.");
      return;
    }
    setSaving(true);
    try {
      const payload = payloadFromForm();
      if (editingId) {
        const { user_id, ...updates } = payload;
        await api.updateAddress(editingId, updates);
      } else {
        await api.addAddress(payload);
      }
      resetForm();
      await loadAddresses();
    } catch (error) {
      Alert.alert("Save address failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  const editAddress = (address) => {
    setEditingId(address.id);
    setForm({
      label: address.label || "Home",
      full_address: address.full_address || "",
      landmark: address.landmark || "",
      area: address.area || "",
      city: address.city || "",
      pincode: address.pincode || "",
      lat: address.lat !== null && address.lat !== undefined ? String(address.lat) : "",
      lng: address.lng !== null && address.lng !== undefined ? String(address.lng) : "",
      is_default: Boolean(address.is_default)
    });
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
      await api.setDefaultAddress(address.id);
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
          <Text className="text-ink font-extrabold text-lg mb-3">{editingId ? "Edit Address" : "Add New Address"}</Text>
          <Text className="text-muted text-xs mb-2">Label</Text>
          <View className="flex-row mb-4">
            {labels.map((item) => (
              <TouchableOpacity
                key={item}
                className={`mr-2 px-4 py-3 rounded-md ${form.label === item ? "bg-primary" : "bg-wash"}`}
                onPress={() => updateForm("label", item)}
              >
                <Text className={form.label === item ? "text-white font-bold" : "text-ink font-bold"}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-muted text-xs mb-2">Full Address</Text>
          <TextInput className="border border-gray-200 rounded-lg px-4 py-3 text-base min-h-24 mb-4" multiline value={form.full_address} onChangeText={(value) => updateForm("full_address", value)} placeholder="Flat, building, street" />
          <Text className="text-muted text-xs mb-2">Landmark</Text>
          <TextInput className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4" value={form.landmark} onChangeText={(value) => updateForm("landmark", value)} placeholder="Near park, gate, shop" />
          <Text className="text-muted text-xs mb-2">Area</Text>
          <TextInput className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4" value={form.area} onChangeText={(value) => updateForm("area", value)} placeholder="Area" />
          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Text className="text-muted text-xs mb-2">City</Text>
              <TextInput className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4" value={form.city} onChangeText={(value) => updateForm("city", value)} placeholder="City" />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-muted text-xs mb-2">Pincode</Text>
              <TextInput className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4" value={form.pincode} onChangeText={(value) => updateForm("pincode", value)} keyboardType="number-pad" placeholder="400001" />
            </View>
          </View>
          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Text className="text-muted text-xs mb-2">Latitude</Text>
              <TextInput className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4" value={form.lat} onChangeText={(value) => updateForm("lat", value)} keyboardType="decimal-pad" placeholder="Optional" />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-muted text-xs mb-2">Longitude</Text>
              <TextInput className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4" value={form.lng} onChangeText={(value) => updateForm("lng", value)} keyboardType="decimal-pad" placeholder="Optional" />
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <Text className="font-bold text-ink">Set as default</Text>
            <Switch value={form.is_default} onValueChange={(value) => updateForm("is_default", value)} trackColor={{ true: "#00B5B0" }} />
          </View>

          <TouchableOpacity className="bg-primary rounded-lg py-4 items-center" onPress={saveAddress} disabled={saving}>
            <Text className="text-white font-bold">{saving ? "Saving..." : editingId ? "Update Address" : "Save Address"}</Text>
          </TouchableOpacity>
          {editingId && (
            <TouchableOpacity className="items-center py-3" onPress={resetForm}>
              <Text className="text-muted font-bold">Cancel edit</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Saved Addresses</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && addresses.length === 0 && <Text className="text-muted">No saved addresses yet.</Text>}
        {addresses.map((address) => (
          <TouchableOpacity key={address.id} className="border border-gray-100 rounded-lg p-4 mb-3" onPress={() => pickAddress(address)} activeOpacity={selectMode ? 0.6 : 1}>
            <View className="flex-row justify-between items-center">
              <Text className="font-extrabold text-ink">{address.label}</Text>
              {address.is_default && <Text className="bg-accent px-3 py-1 rounded-md text-ink font-bold text-xs">Default</Text>}
            </View>
            {addressLines(address).map((line) => <Text key={line} className="text-muted mt-2">{line}</Text>)}
            {selectMode && <Text className="text-primary font-bold mt-3">Tap to deliver here</Text>}
            <View className="flex-row flex-wrap mt-4">
              <TouchableOpacity className="bg-wash px-4 py-2 rounded-md mr-3 mb-2" onPress={() => editAddress(address)}>
                <Text className="text-ink font-bold">Edit</Text>
              </TouchableOpacity>
              {!address.is_default && (
                <TouchableOpacity className="bg-wash px-4 py-2 rounded-md mr-3 mb-2" onPress={() => setDefaultAddress(address)}>
                  <Text className="text-ink font-bold">Set Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity className="bg-red-50 px-4 py-2 rounded-md mb-2" onPress={() => removeAddress(address)}>
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

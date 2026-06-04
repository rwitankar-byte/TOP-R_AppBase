import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen({ onLogin }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const login = () => {
    if (phone.trim() === "admin" && password === "topr@admin123") {
      onLogin();
      return;
    }
    Alert.alert("Login failed", "Invalid admin phone or password.");
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-5 justify-center">
      <Text className="text-primary text-4xl font-extrabold">TOP-R</Text>
      <Text className="text-ink text-2xl font-extrabold mt-2">Admin Login</Text>
      <Text className="text-muted mt-2 mb-8">Manage orders, subscriptions, stock, and customers.</Text>

      <Text className="text-muted text-xs mb-2">Phone</Text>
      <TextInput
        className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4"
        value={phone}
        onChangeText={setPhone}
        autoCapitalize="none"
        placeholder="admin"
      />

      <Text className="text-muted text-xs mb-2">Password</Text>
      <TextInput
        className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-6"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="topr@admin123"
      />

      <TouchableOpacity className="bg-primary rounded-lg py-4 items-center" onPress={login}>
        <Text className="text-white font-extrabold text-base">Login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

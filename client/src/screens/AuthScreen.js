import { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../services/api";
import { getSession, saveSession } from "../services/session";

export default function AuthScreen({ navigation }) {
  const [phone, setPhone] = useState("+91");
  const [token, setToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSession().then((storedSession) => {
      if (storedSession?.user?.id) navigation.replace("MainTabs");
    });
  }, [navigation]);

  const sendOtp = async () => {
    setLoading(true);
    try {
      await api.sendOtp(phone);
      setOtpSent(true);
    } catch (error) {
      Alert.alert("OTP failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!token) {
      Alert.alert("OTP required", "Enter the OTP sent to your phone.");
      return;
    }
    setLoading(true);
    try {
      const authSession = await api.verifyOtp(phone, token);
      await saveSession(authSession);
      navigation.replace("MainTabs");
    } catch (error) {
      Alert.alert("Verification failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white px-5 justify-center">
      <Text className="text-primary text-4xl font-extrabold">TOP-R Water</Text>
      <Text className="text-muted mt-2 mb-8">Login with your phone number to order RO purified jars.</Text>
      <TextInput
        className="border border-gray-200 rounded-lg px-4 py-4 text-base mb-4"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone number"
      />
      {otpSent && (
        <TextInput
          className="border border-gray-200 rounded-lg px-4 py-4 text-base mb-4"
          keyboardType="number-pad"
          value={token}
          onChangeText={setToken}
          placeholder="6-digit OTP"
        />
      )}
      <TouchableOpacity className="bg-primary rounded-lg py-4 items-center" onPress={otpSent ? verifyOtp : sendOtp}>
        <Text className="text-white font-bold text-base">{loading ? "Please wait..." : otpSent ? "Verify OTP" : "Send OTP"}</Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center mt-4" onPress={() => navigation.replace("MainTabs")}>
        <Text className="text-primary font-bold">Explore demo app</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

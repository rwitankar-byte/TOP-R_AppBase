import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ErrorState({ title = "Unable to connect", message = "Check your internet and try again.", onRetry }) {
  return (
    <View className="bg-red-50 border border-red-100 rounded-lg p-5 my-3">
      <View className="flex-row items-center">
        <Ionicons name="alert-circle" size={24} color="#DC2626" />
        <Text className="text-red-700 font-extrabold ml-2">{title}</Text>
      </View>
      <Text className="text-red-600 mt-2">{message}</Text>
      {onRetry ? (
        <TouchableOpacity className="bg-red-500 rounded-lg py-3 items-center mt-4" onPress={onRetry}>
          <Text className="text-white font-extrabold">Try Again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

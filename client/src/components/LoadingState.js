import { ActivityIndicator, Text, View } from "react-native";

export default function LoadingState({ message = "Loading..." }) {
  return (
    <View className="border border-gray-100 rounded-lg p-5 items-center my-3 bg-white">
      <ActivityIndicator color="#00B5B0" />
      <Text className="text-muted font-bold mt-3 text-center">{message}</Text>
    </View>
  );
}

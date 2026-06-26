import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function EmptyState({ icon = "file-tray-outline", title, message, actionLabel, onAction }) {
  return (
    <View className="border border-gray-100 rounded-lg p-5 my-3 items-center bg-white">
      <View className="w-12 h-12 rounded-lg bg-wash items-center justify-center">
        <Ionicons name={icon} size={26} color="#00B5B0" />
      </View>
      <Text className="text-ink font-extrabold text-center mt-3">{title}</Text>
      {message ? <Text className="text-muted text-center mt-2 leading-5">{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity className="bg-primary rounded-lg px-5 py-3 mt-4" onPress={onAction}>
          <Text className="text-white font-extrabold">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

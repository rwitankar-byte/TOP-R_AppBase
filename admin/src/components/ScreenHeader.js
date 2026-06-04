import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ScreenHeader({ title, subtitle, onBack, rightAction, rightIcon = "refresh" }) {
  return (
    <View className="flex-row items-center justify-between mb-4">
      <View className="flex-row items-center flex-1">
        {onBack && (
          <TouchableOpacity className="w-10 h-10 rounded-lg bg-wash items-center justify-center mr-3" onPress={onBack}>
            <Ionicons name="chevron-back" size={22} color="#17252A" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-ink text-2xl font-extrabold">{title}</Text>
          {subtitle && <Text className="text-muted mt-1">{subtitle}</Text>}
        </View>
      </View>
      {rightAction && (
        <TouchableOpacity className="w-10 h-10 rounded-lg bg-primary items-center justify-center ml-3" onPress={rightAction}>
          <Ionicons name={rightIcon} size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

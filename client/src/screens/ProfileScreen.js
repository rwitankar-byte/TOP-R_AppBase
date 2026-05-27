import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const sections = [
  {
    title: "Orders",
    items: ["All Orders", "Order Calendar", "Favorite Orders", "Address Book", "Transaction History", "Return Empty Jar"]
  },
  {
    title: "Customer Support",
    items: ["Contact Information", "Chat With Us", "FAQ", "Locate Us"]
  },
  {
    title: "Rewards",
    items: ["Collected Coupons"]
  },
  {
    title: "Legal",
    items: ["About Us", "Terms & Conditions", "Cancellation & Refunds Policy"]
  }
];

function Row({ label, onPress }) {
  return (
    <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-gray-100" onPress={onPress}>
      <Text className="text-ink font-semibold">{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <View className="flex-row items-center py-5">
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center">
            <Ionicons name="person" size={34} color="#fff" />
          </View>
          <View className="ml-4">
            <Text className="text-ink text-xl font-extrabold">+91 98765 43210</Text>
            <Text className="text-muted">Customer account</Text>
          </View>
        </View>

        <Row label="View Profile Details" />
        <Row label="Wallet (₹250 balance)" onPress={() => navigation.navigate("Payment")} />
        <Row label="Bank Details" />

        {sections.map((section) => (
          <View key={section.title} className="mt-5">
            <Text className="text-primary font-extrabold text-lg mb-1">{section.title}</Text>
            {section.items.map((item) => (
              <Row
                key={item}
                label={item}
                onPress={item === "Transaction History" ? () => navigation.navigate("Payment") : undefined}
              />
            ))}
          </View>
        ))}

        <TouchableOpacity className="bg-red-50 rounded-lg py-4 items-center my-8" onPress={() => navigation.replace("Auth")}>
          <Text className="text-red-500 font-extrabold">Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

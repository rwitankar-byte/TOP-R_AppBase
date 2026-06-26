import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const faqs = [
  {
    question: "How do I place an order?",
    answer: "Go to Products, add items to your cart, choose a delivery address, and complete checkout."
  },
  {
    question: "How do subscriptions work?",
    answer: "A subscription gives you TOP-R 20L jars at home. You pay the refundable jar deposit plus the first water fill, then request refills whenever needed."
  },
  {
    question: "How is jar deposit calculated?",
    answer: "Jar deposit is ₹250 per 20L jar. For example, 2 jars require a refundable deposit of ₹500."
  },
  {
    question: "How do I request refill?",
    answer: "Open Subscriptions, choose your active subscription, select refill quantity, add it to cart, and complete payment."
  },
  {
    question: "How do I cancel subscription?",
    answer: "Open Subscriptions or Return Empty Jar, request return pickup, and keep all jars ready for collection."
  },
  {
    question: "When will I get my refund?",
    answer: "Refund is processed after TOP-R confirms the returned jars. The refund amount is based on your refundable jar deposit."
  },
  {
    question: "How can I contact delivery boy?",
    answer: "Delivery boy name and phone appear in Order Tracking after your order is assigned."
  }
];

export default function FAQScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">FAQ</Text>
        {faqs.map((item) => (
          <View key={item.question} className="border border-gray-100 rounded-lg p-4 mb-3">
            <Text className="text-ink font-extrabold">{item.question}</Text>
            <Text className="text-muted mt-2 leading-5">{item.answer}</Text>
          </View>
        ))}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}

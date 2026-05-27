import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import ProductCard from "../components/ProductCard";
import { banners, categories, products } from "../data/products";

export default function HomeScreen({ navigation }) {
  const popular = products.filter((product) => product.isPopular);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} className="px-4">
        <TouchableOpacity className="flex-row items-center justify-between py-3">
          <View className="flex-row items-center">
            <Ionicons name="location" color="#00B5B0" size={22} />
            <View className="ml-2">
              <Text className="text-xs text-muted">Deliver to</Text>
              <Text className="font-bold text-ink">Mumbai, Andheri West</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" color="#17252A" size={20} />
        </TouchableOpacity>

        <View className="bg-wash rounded-lg px-4 py-3 flex-row items-center mb-4">
          <Ionicons name="search" color="#6B7280" size={20} />
          <TextInput className="ml-2 flex-1" placeholder="Search water jars, bottles, subscriptions" />
        </View>

        <FlatList
          horizontal
          pagingEnabled
          data={banners}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View className="w-80 mr-4 bg-primary rounded-lg p-5 min-h-36 justify-center">
              <Text className="text-white text-2xl font-extrabold">{item.title}</Text>
              <Text className="text-white mt-2">{item.subtitle}</Text>
            </View>
          )}
        />

        <Text className="text-ink font-extrabold text-xl mt-6 mb-3">Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((category) => (
            <TouchableOpacity key={category} className="bg-wash border border-gray-100 rounded-lg px-4 py-3 mr-3">
              <Text className="text-ink font-bold">{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View className="flex-row items-center justify-between mt-6 mb-3">
          <Text className="text-ink font-extrabold text-xl">Most Popular Products</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Products")}>
            <Text className="text-primary font-bold">View all</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          data={popular}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => <ProductCard product={item} compact />}
        />

        <TouchableOpacity
          className="bg-accent rounded-lg p-5 mt-6 mb-8"
          onPress={() => navigation.navigate("Subscriptions")}
        >
          <Text className="text-ink text-xl font-extrabold">Never run out of drinking water</Text>
          <Text className="text-ink mt-1">Set up daily, weekly, or custom 20L jar deliveries.</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

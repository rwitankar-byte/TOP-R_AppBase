import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

const frequencies = ["Daily", "Weekly", "Custom"];
const JAR_DEPOSIT = 250;
const WATER_CHARGE = 40;

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getNextDeliveryDate(subscription) {
  const start = new Date(subscription.start_date);
  const today = new Date();
  if (Number.isNaN(start.getTime()) || start >= today) return subscription.start_date;

  const next = new Date(start);
  const step = subscription.frequency === "Daily" ? 1 : 7;
  while (next < today) next.setDate(next.getDate() + step);
  return formatDate(next);
}

export default function SubscriptionsScreen({ navigation }) {
  const { addSubscriptionToCart } = useCart();
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [jarCount, setJarCount] = useState("1");
  const [frequency, setFrequency] = useState("Weekly");
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const jars = Math.max(1, Number(jarCount || 1));
  const jarDeposit = jars * JAR_DEPOSIT;
  const waterCharge = jars * WATER_CHARGE;
  const startCost = jarDeposit + waterCharge;

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const storedSession = await getOrCreateMockSession();
      setSession(storedSession);
      const productData = await api.getProducts();
      setProducts(productData);
      setSelectedProductId((current) => current || productData[0]?.id || "");

      if (storedSession?.user?.id) {
        const [addressData, subscriptionData] = await Promise.all([
          api.getAddresses(storedSession.user.id),
          api.getSubscriptions(storedSession.user.id, "Active")
        ]);
        setAddresses(addressData);
        setSubscriptions(subscriptionData.filter((subscription) => subscription.status === "Active"));
      }
    } catch (error) {
      Alert.alert("Subscriptions", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const createSubscription = async () => {
    if (!selectedProduct?.id) {
      Alert.alert("Choose product", "No product is available for subscription.");
      return;
    }

    setSaving(true);
    try {
      const activeSession = session?.user?.id ? session : await getOrCreateMockSession();
      setSession(activeSession);
      addSubscriptionToCart({
        id: `subscription-${selectedProduct.id}-${frequency}-${formatDate(startDate)}-${jars}-${Date.now()}`,
        name: `${selectedProduct.name} Subscription (${frequency}) x ${jars} jar${jars > 1 ? "s" : ""}`,
        product_id: selectedProduct.id,
        jar_count: jars,
        frequency,
        start_date: formatDate(startDate),
        jar_deposit: jarDeposit,
        water_charge_per_delivery: waterCharge,
        total: startCost,
        price: startCost,
        image_url: selectedProduct.image_url,
        user_id: activeSession.user.id,
      });
      Alert.alert("Subscription added to cart", "Complete payment in Cart.");
      navigation.navigate("Cart");
    } catch (error) {
      Alert.alert("Subscription cart failed", error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSubscription = async (id, updates) => {
    try {
      await api.updateSubscription(id, updates);
      await loadData();
    } catch (error) {
      Alert.alert("Subscription update failed", error.message);
    }
  };

  const confirmCancel = (subscription) => {
    const refund = Number(subscription.jar_deposit || subscription.jar_count * JAR_DEPOSIT);
    Alert.alert(
      "Cancel subscription",
      `Return jars to get ₹${refund} refund to your wallet.`,
      [
        { text: "Keep Active", style: "cancel" },
        {
          text: "Confirm Return",
          style: "destructive",
          onPress: () =>
            updateSubscription(subscription.id, {
              status: "Cancelled",
              jars_returned: true
            })
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Subscriptions</Text>
        <Text className="text-ink font-extrabold text-lg mb-3">New Subscription</Text>
        <View className="border border-gray-100 rounded-lg p-4 mb-5">
          <Text className="text-muted text-xs mb-2">Product</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {products.map((product) => {
              const selected = product.id === selectedProduct?.id;
              return (
                <TouchableOpacity
                  key={product.id}
                  className={`mr-2 px-4 py-3 rounded-md border ${selected ? "bg-primary border-primary" : "bg-white border-gray-200"}`}
                  onPress={() => setSelectedProductId(product.id)}
                >
                  <Text className={selected ? "text-white font-bold" : "text-ink font-bold"}>{product.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text className="text-muted text-xs mb-2">Number of jars</Text>
          <TextInput
            className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4"
            keyboardType="number-pad"
            value={jarCount}
            onChangeText={setJarCount}
          />

          <Text className="text-muted text-xs mb-2">Frequency</Text>
          <View className="flex-row mb-4">
            {frequencies.map((item) => (
              <TouchableOpacity
                key={item}
                className={`mr-2 px-4 py-3 rounded-md ${frequency === item ? "bg-primary" : "bg-wash"}`}
                onPress={() => setFrequency(item)}
              >
                <Text className={frequency === item ? "text-white font-bold" : "text-ink font-bold"}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-muted text-xs mb-2">Start date</Text>
          {Platform.OS === "web" ? (
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-base mb-4"
              value={formatDate(startDate)}
              onChangeText={(value) => {
                const next = new Date(value);
                if (!Number.isNaN(next.getTime())) setStartDate(next);
              }}
              placeholder="YYYY-MM-DD"
            />
          ) : (
            <>
              <TouchableOpacity className="border border-gray-200 rounded-lg px-4 py-3 mb-4" onPress={() => setShowDatePicker(true)}>
                <Text className="text-ink font-bold">{formatDate(startDate)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_event, date) => {
                    setShowDatePicker(false);
                    if (date) setStartDate(date);
                  }}
                />
              )}
            </>
          )}

          <View className="bg-wash rounded-lg p-4 mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Jar deposit ({jars} × ₹250)</Text>
              <Text className="font-bold">₹{jarDeposit}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">First delivery ({jars} × ₹40)</Text>
              <Text className="font-bold">₹{waterCharge}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-ink font-extrabold">Start cost</Text>
              <Text className="text-primary font-extrabold">₹{startCost}</Text>
            </View>
          </View>

          <TouchableOpacity className="bg-primary rounded-lg py-4 items-center" onPress={createSubscription} disabled={saving}>
            <Text className="text-white font-bold">{saving ? "Adding..." : "Create Subscription"}</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Active subscriptions</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && subscriptions.length === 0 && <Text className="text-muted mb-4">No subscriptions yet.</Text>}
        {subscriptions.map((subscription) => (
          <View key={subscription.id} className="border border-gray-100 rounded-lg p-4 mb-4">
            <View className="flex-row justify-between">
              <Text className="font-bold text-ink">{subscription.products?.name || "Water Jar Subscription"}</Text>
              <Text className="text-primary font-bold">{subscription.status}</Text>
            </View>
            <Text className="text-muted mt-2">
              {subscription.jar_count || subscription.quantity} jars • {subscription.frequency}
            </Text>
            <Text className="text-muted mt-1">Next delivery: {getNextDeliveryDate(subscription)}</Text>
            <Text className="text-muted mt-1">
              Deposit: ₹{Number(subscription.jar_deposit || 0)} • Delivery: ₹{Number(subscription.water_charge_per_delivery || 0)}
            </Text>
            <View className="flex-row mt-4">
              <TouchableOpacity
                className="bg-wash px-4 py-2 rounded-md mr-3"
                onPress={() => updateSubscription(subscription.id, { status: subscription.status === "Paused" ? "Active" : "Paused" })}
                disabled={subscription.status === "Cancelled"}
              >
                <Text className="font-bold text-ink">Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity className="bg-red-50 px-4 py-2 rounded-md" onPress={() => confirmCancel(subscription)}>
                <Text className="font-bold text-red-500">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import { getOrCreateMockSession } from "../services/session";

const JAR_DEPOSIT = 250;
const WATER_CHARGE = 40;
const activeStatuses = ["Active", "Paused"];
const returnStatuses = ["Cancellation Requested", "Return Pending", "Picked Up", "Returned", "Refund Completed", "Cancelled"];
const pendingReturnStatuses = returnStatuses.filter((status) => status !== "Cancelled");

function returnMessage(status) {
  const messages = {
    "Cancellation Requested": "Cancellation request submitted. Waiting for admin approval.",
    "Return Pending": "Return pickup is pending. Please keep empty jars ready.",
    "Picked Up": "Empty jars picked up. Refund verification in progress.",
    Returned: "Jars returned successfully. Refund will be processed soon.",
    "Refund Completed": "Refund completed to your wallet.",
    Cancelled: "Subscription cancelled."
  };
  return messages[status] || "Return request is being processed.";
}

function Stepper({ value, onDecrease, onIncrease, maximum }) {
  return (
    <View className="flex-row items-center self-start border border-primary rounded-lg overflow-hidden">
      <TouchableOpacity className="w-10 h-10 bg-primary items-center justify-center" onPress={onDecrease} disabled={value <= 1}>
        <Text className="text-white text-xl font-extrabold">-</Text>
      </TouchableOpacity>
      <Text className="min-w-[60px] text-center text-primary text-xl font-extrabold">{value}</Text>
      <TouchableOpacity className="w-10 h-10 bg-primary items-center justify-center" onPress={onIncrease} disabled={maximum && value >= maximum}>
        <Text className="text-white text-xl font-extrabold">+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SubscriptionsScreen({ navigation }) {
  const { addSubscriptionToCart, addRefillToCart } = useCart();
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [jarCount, setJarCount] = useState(1);
  const [refillQuantities, setRefillQuantities] = useState({});
  const [openRefillId, setOpenRefillId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const jars = Math.max(1, Number(jarCount || 1));
  const jarDeposit = jars * JAR_DEPOSIT;
  const waterCharge = jars * WATER_CHARGE;
  const startCost = jars * (JAR_DEPOSIT + WATER_CHARGE);
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const loadData = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const storedSession = await getOrCreateMockSession();
      setSession(storedSession);
      const productData = await api.getProducts();
      setProducts(productData);
      setSelectedProductId((current) => current || productData[0]?.id || "");
      if (storedSession?.user?.id) {
        setSubscriptions(await api.getSubscriptions(storedSession.user.id));
      }
    } catch (error) {
      Alert.alert("Subscriptions", error.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData({ showLoading: false });
    } finally {
      setRefreshing(false);
    }
  };

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
        id: `subscription-${selectedProduct.id}-${jars}-${Date.now()}`,
        name: `${selectedProduct.name} Subscription x ${jars} jar${jars > 1 ? "s" : ""}`,
        product_id: selectedProduct.id,
        jar_count: jars,
        frequency: "Custom",
        jar_deposit: jarDeposit,
        water_charge_per_delivery: waterCharge,
        total: startCost,
        price: startCost,
        image_url: selectedProduct.image_url,
        user_id: activeSession.user.id
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
    Alert.alert("Cancel subscription", `Request pickup of all jars. Your ₹${refund} deposit will be refunded to your wallet after the jars are returned.`, [
      { text: "Keep Active", style: "cancel" },
      {
        text: "Request Return",
        style: "destructive",
        onPress: async () => {
          try {
            const activeSession = session?.user?.id ? session : await getOrCreateMockSession();
            await api.placeOrder({
              type: "return",
              user_id: activeSession.user.id,
              address_id: subscription.address_id,
              subscription_id: subscription.id,
              total_amount: 0,
              delivery_date: new Date().toISOString().slice(0, 10),
              items: [{ product_id: subscription.product_id, quantity: Number(subscription.jar_count || subscription.quantity || 1), unit_price: 0 }]
            });
            Alert.alert("Return request sent", "Admin will confirm pickup soon.");
            await loadData();
          } catch (error) {
            Alert.alert("Return request failed", error.message);
          }
        }
      }
    ]);
  };

  const refillQuantityFor = (subscription) => Math.max(1, Number(refillQuantities[subscription.id] || 1));
  const activeSubscriptions = subscriptions.filter((subscription) => activeStatuses.includes(subscription.status));
  const pendingSubscriptions = subscriptions.filter((subscription) => pendingReturnStatuses.includes(subscription.status));

  const addRefill = (subscription) => {
    const quantity = refillQuantityFor(subscription);
    const productName = subscription.products?.name || "Water Jar";
    addRefillToCart({
      id: `refill-${subscription.id}-${Date.now()}`,
      type: "refill",
      subscription_id: subscription.id,
      product_id: subscription.product_id,
      quantity,
      jar_count: Number(subscription.jar_count || subscription.quantity || 1),
      price: quantity * WATER_CHARGE,
      total: quantity * WATER_CHARGE,
      unit_price: WATER_CHARGE,
      name: `${productName} Refill x ${quantity} jar${quantity > 1 ? "s" : ""}`,
      image_url: subscription.products?.image_url
    });
    setOpenRefillId(null);
    Alert.alert("Refill added to cart", "Complete payment in Cart.");
    navigation.navigate("Cart");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00B5B0"]} tintColor="#00B5B0" />}
      >
        <Text className="text-ink text-2xl font-extrabold my-4">Subscriptions</Text>
        <Text className="text-ink font-extrabold text-lg mb-3">New Subscription</Text>
        <View className="border border-gray-100 rounded-lg p-4 mb-5">
          <Text className="text-muted text-xs mb-2">Product</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {products.map((product) => {
              const selected = product.id === selectedProduct?.id;
              return (
                <TouchableOpacity key={product.id} className={`mr-2 px-4 py-3 rounded-md border ${selected ? "bg-primary border-primary" : "bg-white border-gray-200"}`} onPress={() => setSelectedProductId(product.id)}>
                  <Text className={selected ? "text-white font-bold" : "text-ink font-bold"}>{product.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text className="text-muted text-xs mb-2">How many jars?</Text>
          <View className="mb-4">
            <Stepper value={jars} onDecrease={() => setJarCount((prev) => Math.max(1, prev - 1))} onIncrease={() => setJarCount((prev) => prev + 1)} />
          </View>

          <View className="bg-wash rounded-lg p-4 mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Jar deposit ({jars} x ₹250)</Text>
              <Text className="font-bold">₹{jarDeposit}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-muted">Water fill ({jars} x ₹40)</Text>
              <Text className="font-bold">₹{waterCharge}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-ink font-extrabold">Total start cost</Text>
              <Text className="text-primary font-extrabold">₹{startCost}</Text>
            </View>
          </View>

          <TouchableOpacity className="bg-primary rounded-lg py-4 items-center" onPress={createSubscription} disabled={saving}>
            <Text className="text-white font-bold">{saving ? "Adding..." : "Create Subscription"}</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-ink font-extrabold text-lg mb-3">Active Subscriptions</Text>
        {loading && <ActivityIndicator color="#00B5B0" />}
        {!loading && activeSubscriptions.length === 0 && <Text className="text-muted mb-4">No active subscriptions. Start a water jar subscription.</Text>}
        {activeSubscriptions.map((subscription) => {
          const maxJars = Number(subscription.jar_count || subscription.quantity || 1);
          const refillQuantity = refillQuantityFor(subscription);
          return (
            <View key={subscription.id} className="border border-gray-100 rounded-lg p-4 mb-4">
              <View className="flex-row justify-between">
                <Text className="font-bold text-ink">{subscription.products?.name || "Water Jar Subscription"}</Text>
                <Text className="text-primary font-bold">{subscription.status}</Text>
              </View>
              <Text className="text-muted mt-2">Jars at home: {maxJars}</Text>
              <Text className="text-muted mt-1">Jar deposit: ₹{Number(subscription.jar_deposit || 0)}</Text>

              {openRefillId === subscription.id ? (
                <View className="bg-wash rounded-lg p-3 mt-4">
                  <Text className="text-ink font-bold mb-2">Refill quantity</Text>
                  <Stepper
                    value={refillQuantity}
                    maximum={maxJars}
                    onDecrease={() => setRefillQuantities((current) => ({ ...current, [subscription.id]: Math.max(1, refillQuantity - 1) }))}
                    onIncrease={() => setRefillQuantities((current) => ({ ...current, [subscription.id]: Math.min(maxJars, refillQuantity + 1) }))}
                  />
                  <Text className="text-primary font-extrabold mt-3">Water refill cost: ₹{refillQuantity * WATER_CHARGE}</Text>
                  <View className="flex-row mt-3">
                    <TouchableOpacity className="bg-primary rounded-md px-4 py-3 mr-3" onPress={() => addRefill(subscription)}>
                      <Text className="text-white font-bold">Add to Cart</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-white rounded-md px-4 py-3" onPress={() => setOpenRefillId(null)}>
                      <Text className="text-ink font-bold">Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity className="bg-primary rounded-lg py-3 items-center mt-4" onPress={() => setOpenRefillId(subscription.id)}>
                  <Text className="text-white font-bold">Request Refill</Text>
                </TouchableOpacity>
              )}

              <View className="flex-row mt-3">
                <TouchableOpacity className="bg-wash px-4 py-2 rounded-md mr-3" onPress={() => updateSubscription(subscription.id, { status: subscription.status === "Paused" ? "Active" : "Paused" })}>
                  <Text className="font-bold text-ink">{subscription.status === "Paused" ? "Resume" : "Pause"}</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-red-50 px-4 py-2 rounded-md" onPress={() => confirmCancel(subscription)}>
                  <Text className="font-bold text-red-500">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        {!loading && pendingSubscriptions.length > 0 && (
          <>
            <Text className="text-ink font-extrabold text-lg mt-2 mb-3">Pending Cancellation / Return Requests</Text>
            {pendingSubscriptions.map((subscription) => (
              <View key={subscription.id} className="border border-gray-100 rounded-lg p-4 mb-4">
                <View className="flex-row justify-between">
                  <Text className="font-bold text-ink">{subscription.products?.name || "Water Jar Subscription"}</Text>
                  <Text className="text-primary font-bold">{subscription.status}</Text>
                </View>
                <Text className="text-muted mt-2">Jars: {subscription.jar_count || subscription.quantity}</Text>
                <Text className="text-muted mt-1">Refundable deposit: ₹{Number(subscription.jar_deposit || 0)}</Text>
                <Text className="text-ink font-bold mt-3">{returnMessage(subscription.status)}</Text>
              </View>
            ))}
          </>
        )}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

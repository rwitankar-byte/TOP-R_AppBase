import { useCallback, useState } from "react";
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import RazorpayCheckout from 'react-native-razorpay';
import { SafeAreaView } from "react-native-safe-area-context";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { useCart } from "../context/CartContext";
import { api } from "../services/api";
import { getOrCreateMockSession, getSelectedAddress, saveSelectedAddress } from "../services/session";

function formatAddress(address) {
  if (!address) return "No address found";
  return [
    `${address.label}: ${address.full_address}`,
    address.landmark ? `Landmark: ${address.landmark}` : null,
    [address.area, address.city, address.pincode].filter(Boolean).join(", ")
  ].filter(Boolean).join("\n");
}

export default function CartScreen({ navigation }) {
  const { items, updateQuantity, total, clearCart } = useCart();
  const [session, setSession] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressError, setAddressError] = useState("");
  const address = selectedAddress || addresses.find((item) => item.is_default) || addresses[0];

  const loadAddresses = useCallback(async () => {
    try {
      const storedSession = await getOrCreateMockSession();
      setSession(storedSession);
      if (storedSession?.user?.id) {
        const addressData = await api.getAddresses(storedSession.user.id);
        setAddresses(addressData);
        const savedAddress = await getSelectedAddress();
        const freshSelectedAddress = savedAddress ? addressData.find((item) => item.id === savedAddress.id) : null;
        const fallbackAddress = addressData.find((item) => item.is_default) || addressData[0] || null;
        setSelectedAddress(freshSelectedAddress || fallbackAddress);
        if (freshSelectedAddress || fallbackAddress) {
          await saveSelectedAddress(freshSelectedAddress || fallbackAddress);
        }
        setAddressError("");
      }
    } catch (error) {
      setAddressError(error.message || "Unable to load addresses.");
      Alert.alert("Cart", error.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  const completeCheckout = async (payment) => {
    const productItems = items.filter((item) => item.type === "product");
    const subscriptionItems = items.filter((item) => item.type === "subscription");
    const refillItems = items.filter((item) => item.type === "refill");
    let paymentLinked = false;

    let order = null;
    if (productItems.length) {
      const orderBody = {
        user_id: session.user.id,
        address_id: address.id,
        payment_id: paymentLinked ? undefined : payment?.id,
        payment_method: "online",
        payment_status: "paid",
        total_amount: productItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
        items: productItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: Number(item.price)
        }))
      };
      console.log("POST /orders request body:", JSON.stringify(orderBody));
      order = await api.placeOrder(orderBody);
      paymentLinked = Boolean(payment?.id);
    }

    for (const item of subscriptionItems) {
      const subscription = await api.createSubscription({
        user_id: session.user.id,
        product_id: item.product_id,
        address_id: address?.id,
        frequency: item.frequency,
        start_date: item.start_date,
        jar_count: item.jar_count,
        status: "Pending"
      });
      await api.updateSubscription(subscription.id, { status: "Active" });
      const subscriptionOrder = {
        user_id: session.user.id,
        address_id: address.id,
        payment_id: paymentLinked ? undefined : payment?.id,
        payment_method: "online",
        payment_status: "paid",
        type: "subscription",
        subscription_id: subscription.id,
        total_amount: Number(item.jar_deposit) + Number(item.water_charge_per_delivery),
        items: [{ product_id: item.product_id, quantity: item.jar_count, unit_price: 290 }]
      };
      console.log("POST /orders subscription request body:", JSON.stringify(subscriptionOrder));
      await api.placeOrder(subscriptionOrder);
      paymentLinked = Boolean(payment?.id);
    }

    for (const item of refillItems) {
      const refillBody = {
        user_id: session.user.id,
        address_id: address.id,
        payment_id: paymentLinked ? undefined : payment?.id,
        payment_method: "online",
        payment_status: "paid",
        type: "refill",
        subscription_id: item.subscription_id,
        total_amount: Number(item.quantity) * 40,
        items: [{ product_id: item.product_id, quantity: item.quantity, unit_price: 40 }]
      };
      console.log("POST /orders refill request body:", JSON.stringify(refillBody));
      await api.placeOrder(refillBody);
      paymentLinked = Boolean(payment?.id);
    }

    clearCart();
    navigation.navigate("AllOrders");
  };

  const placeOrder = async () => {
    if (!items.length) {
      Alert.alert("Cart is empty", "Add a product before placing an order.");
      return;
    }

    if (!address?.id) {
      Alert.alert("Address required", "Add or select a delivery address before checkout.", [
        { text: "Cancel", style: "cancel" },
        { text: "Add Address", onPress: () => navigation.navigate("AddressBook", { selectMode: true }) }
      ]);
      return;
    }

    if (!session?.user?.id) {
      Alert.alert("Session required", "Please continue as guest or login before checkout.");
      return;
    }

    setPlacing(true);
    try {
      const totalInPaise = Math.round(Number(total) * 100);
      console.log("Creating Razorpay order with amount in paise:", totalInPaise);
      const paymentOrder = await api.createRazorpayOrder({
        user_id: session.user.id,
        amount: totalInPaise,
        currency: "INR",
        receipt: `cart_${Date.now()}`
      });
      console.log("Razorpay create-order response:", JSON.stringify(paymentOrder));

      const userPhone = session.user.phone || session.profile?.phone;
      const userName = session.profile?.name;
      const contact = userPhone ? userPhone.replace(/\D/g, "") : "";
      const options = {
        description: "Water jar order",
        image: "",
        currency: "INR",
        key: "rzp_test_Swk6ZXYsiWvhNK",
        amount: String(totalInPaise),
        order_id: paymentOrder.razorpay_order_id,
        name: "TOP-R Water",
        prefill: {
          contact,
          name: userName || "Customer"
        },
        theme: { color: "#00B5B0" }
      };

      console.log("Opening Razorpay checkout with options:", JSON.stringify(options));
      const razorpayResult = await RazorpayCheckout.open(options)
        .then((data) => {
          console.log("Razorpay success:", JSON.stringify(data));
          return data;
        })
        .catch((error) => {
          console.log("Razorpay error:", JSON.stringify(error));
          Alert.alert("Payment failed", error.description || "Try again.");
          error.razorpayAlertShown = true;
          throw error;
        });
      console.log("Razorpay checkout closed after success:", JSON.stringify(razorpayResult));

      const verified = await api.verifyRazorpayPayment({
        razorpay_order_id: razorpayResult.razorpay_order_id,
        razorpay_payment_id: razorpayResult.razorpay_payment_id,
        razorpay_signature: razorpayResult.razorpay_signature
      });

      if (!verified.success) {
        throw new Error("Payment verification failed");
      }

      await completeCheckout(verified.payment);
    } catch (error) {
      if (error?.razorpayAlertShown) return;
      const message = error?.description || error?.message || "";
      Alert.alert(message.includes("cancel") ? "Payment cancelled" : "Payment failed", "Payment failed. Try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="px-4">
        <Text className="text-ink text-2xl font-extrabold my-4">Cart</Text>
        <TouchableOpacity
          className="border border-gray-100 rounded-lg p-4 mb-4 flex-row items-center justify-between"
          onPress={() => navigation.navigate("AddressBook", { selectMode: true })}
        >
          <View>
            <Text className="text-xs text-muted">Delivery address</Text>
            <Text className="text-ink font-bold mt-1">{formatAddress(address)}</Text>
            {!address && <Text className="text-red-500 font-bold mt-2">Add an address to continue checkout.</Text>}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#17252A" />
        </TouchableOpacity>
        {addressError ? <ErrorState title="Address unavailable" message={addressError} onRetry={loadAddresses} /> : null}

        {!items.length && (
          <EmptyState icon="cart-outline" title="Your cart is empty." message="Add products or a subscription to continue checkout." actionLabel="Browse Products" onAction={() => navigation.navigate("Products")} />
        )}

        {items.map((item) => (
          <View key={item.id} className="flex-row border border-gray-100 rounded-lg p-3 mb-3">
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} className="w-20 h-20 rounded-md" />
            ) : (
              <View className="w-20 h-20 rounded-md bg-wash items-center justify-center">
                <Ionicons name={item.type === "subscription" ? "repeat" : "water"} size={28} color="#00B5B0" />
              </View>
            )}
            <View className="flex-1 ml-3">
              <Text className="font-bold text-ink">{item.name}</Text>
              {item.type === "refill" && <Text className="text-primary text-xs font-bold mt-1">Refill - Water Only</Text>}
              {item.type === "subscription" && (
                <Text className="text-muted text-xs mt-1">
                  Deposit ₹{item.jar_deposit} + water fill ₹{item.water_charge_per_delivery}
                </Text>
              )}
              <Text className="text-primary font-extrabold mt-1">₹{Number(item.price)}</Text>
              {item.type === "subscription" || item.type === "refill" ? (
                <TouchableOpacity className="bg-red-50 px-3 py-2 rounded-md mt-3 self-start" onPress={() => updateQuantity(item.id, 0)}>
                  <Text className="text-red-500 font-bold">Remove</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center mt-3">
                  <TouchableOpacity className="bg-wash p-2 rounded-md" onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Ionicons name="remove" size={18} color="#17252A" />
                  </TouchableOpacity>
                  <Text className="mx-4 font-bold">{item.quantity}</Text>
                  <TouchableOpacity className="bg-primary p-2 rounded-md" onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}

        {items.length > 0 && <View className="border-t border-gray-100 pt-4 mt-2">
          <View className="flex-row justify-between mb-2">
            <Text className="text-muted">Subtotal</Text>
            <Text className="font-bold">₹{total}</Text>
          </View>
          <View className="flex-row justify-between mb-4">
            <Text className="text-muted">Delivery</Text>
            <Text className="font-bold">₹0</Text>
          </View>
          <View className="flex-row justify-between mb-5">
            <Text className="text-ink text-lg font-extrabold">Total amount</Text>
            <Text className="text-primary text-lg font-extrabold">₹{total}</Text>
          </View>
          <TouchableOpacity className="bg-primary rounded-lg py-4 items-center mb-4" onPress={placeOrder} disabled={placing}>
            <Text className="text-white font-bold text-base">{placing ? "Processing..." : "Pay & Place Order"}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="items-center mb-8" onPress={() => navigation.navigate("Payment")}>
            <Text className="text-primary font-bold">Go to payments</Text>
          </TouchableOpacity>
        </View>}
      </ScrollView>
    </SafeAreaView>
  );
}

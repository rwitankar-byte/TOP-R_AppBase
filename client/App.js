import { useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { CartProvider } from "./src/context/CartContext";
import AddressBookScreen from "./src/screens/AddressBookScreen";
import AllOrdersScreen from "./src/screens/AllOrdersScreen";
import AuthScreen from "./src/screens/AuthScreen";
import FAQScreen from "./src/screens/FAQScreen";
import FavoriteOrdersScreen from "./src/screens/FavoriteOrdersScreen";
import LocateUsScreen from "./src/screens/LocateUsScreen";
import OrderCalendarScreen from "./src/screens/OrderCalendarScreen";
import OrderTrackingScreen from "./src/screens/OrderTrackingScreen";
import PaymentScreen from "./src/screens/PaymentScreen";
import ReturnEmptyJarScreen from "./src/screens/ReturnEmptyJarScreen";
import TransactionHistoryScreen from "./src/screens/TransactionHistoryScreen";
import Tabs from "./src/navigation/Tabs";
import { api } from "./src/services/api";
import { addForegroundNotificationListener, registerForPushNotifications } from "./src/services/notifications";
import { getSession } from "./src/services/session";

const Stack = createNativeStackNavigator();

export default function App() {
  const notificationSubscription = useRef(null);
  const registeredUserId = useRef(null);

  const setupNotifications = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session?.user?.id || registeredUserId.current === session.user.id) return;

      const token = await registerForPushNotifications();
      if (token) {
        await api.updatePushToken(session.user.id, token);
      }
      registeredUserId.current = session.user.id;

      if (!notificationSubscription.current) {
        notificationSubscription.current = addForegroundNotificationListener((notification) => {
          const title = notification.request.content.title || "Notification";
          const body = notification.request.content.body || "";
          Alert.alert(title, body);
        });
      }
    } catch (error) {
      console.log("Notification setup skipped:", error.message);
    }
  }, []);

  useEffect(() => {
    setupNotifications().catch((error) => console.log("Notification setup failed:", error.message));

    return () => {
      notificationSubscription.current?.remove();
    };
  }, [setupNotifications]);

  return (
    <CartProvider>
      <NavigationContainer onStateChange={() => setupNotifications().catch((error) => console.log("Notification setup failed:", error.message))}>
        <StatusBar style="dark" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: "#00B5B0" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "700" }
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} options={{ title: "Phone Login" }} />
          <Stack.Screen name="MainTabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="AllOrders" component={AllOrdersScreen} options={{ title: "All Orders" }} />
          <Stack.Screen name="OrderCalendar" component={OrderCalendarScreen} options={{ title: "Order Calendar" }} />
          <Stack.Screen name="FavoriteOrders" component={FavoriteOrdersScreen} options={{ title: "Favorite Orders" }} />
          <Stack.Screen name="AddressBook" component={AddressBookScreen} options={{ title: "Address Book" }} />
          <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ title: "Transaction History" }} />
          <Stack.Screen name="ReturnEmptyJar" component={ReturnEmptyJarScreen} options={{ title: "Return Empty Jar" }} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: "Order Tracking" }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payments" }} />
          <Stack.Screen name="FAQ" component={FAQScreen} options={{ title: "FAQ" }} />
          <Stack.Screen name="LocateUs" component={LocateUsScreen} options={{ title: "Locate Us" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}

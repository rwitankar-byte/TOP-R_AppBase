import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { CartProvider } from "./src/context/CartContext";
import AuthScreen from "./src/screens/AuthScreen";
import OrderTrackingScreen from "./src/screens/OrderTrackingScreen";
import PaymentScreen from "./src/screens/PaymentScreen";
import Tabs from "./src/navigation/Tabs";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <CartProvider>
      <NavigationContainer>
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
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: "Order Tracking" }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payments" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}

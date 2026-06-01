import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { CartProvider } from "./src/context/CartContext";
import AddressBookScreen from "./src/screens/AddressBookScreen";
import AllOrdersScreen from "./src/screens/AllOrdersScreen";
import AuthScreen from "./src/screens/AuthScreen";
import FavoriteOrdersScreen from "./src/screens/FavoriteOrdersScreen";
import OrderCalendarScreen from "./src/screens/OrderCalendarScreen";
import OrderTrackingScreen from "./src/screens/OrderTrackingScreen";
import PaymentScreen from "./src/screens/PaymentScreen";
import ReturnEmptyJarScreen from "./src/screens/ReturnEmptyJarScreen";
import TransactionHistoryScreen from "./src/screens/TransactionHistoryScreen";
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
          <Stack.Screen name="AllOrders" component={AllOrdersScreen} options={{ title: "All Orders" }} />
          <Stack.Screen name="OrderCalendar" component={OrderCalendarScreen} options={{ title: "Order Calendar" }} />
          <Stack.Screen name="FavoriteOrders" component={FavoriteOrdersScreen} options={{ title: "Favorite Orders" }} />
          <Stack.Screen name="AddressBook" component={AddressBookScreen} options={{ title: "Address Book" }} />
          <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} options={{ title: "Transaction History" }} />
          <Stack.Screen name="ReturnEmptyJar" component={ReturnEmptyJarScreen} options={{ title: "Return Empty Jar" }} />
          <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} options={{ title: "Order Tracking" }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payments" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}

import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import CustomerDetailScreen from "./src/screens/CustomerDetailScreen";
import CustomersScreen from "./src/screens/CustomersScreen";
import DeliveryBoysScreen from "./src/screens/DeliveryBoysScreen";
import DeliveryDashboardScreen from "./src/screens/DeliveryDashboardScreen";
import DeliveryLoginScreen from "./src/screens/DeliveryLoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import InventoryScreen from "./src/screens/InventoryScreen";
import LoginScreen from "./src/screens/LoginScreen";
import OrderDetailScreen from "./src/screens/OrderDetailScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import ReturnRequestsScreen from "./src/screens/ReturnRequestsScreen";
import SubscriptionDetailScreen from "./src/screens/SubscriptionDetailScreen";
import SubscriptionsScreen from "./src/screens/SubscriptionsScreen";
import { clearAdminSession, getAdminSession, saveAdminSession } from "./src/services/session";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator({ onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#00B5B0", borderTopWidth: 0, height: 64, paddingBottom: 8 },
        tabBarActiveTintColor: "#FFD700",
        tabBarInactiveTintColor: "#fff",
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: "grid",
            Orders: "receipt",
            Subscriptions: "repeat",
            Inventory: "cube",
            Customers: "people"
          };
          return <Ionicons name={icons[route.name] || "ellipse"} color={color} size={size} />;
        }
      })}
    >
      <Tab.Screen name="Dashboard">
        {(props) => <DashboardScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getAdminSession()
      .then(setSession)
      .finally(() => setCheckingSession(false));
  }, []);

  const handleLogin = async () => {
    const nextSession = { admin: true, loggedInAt: new Date().toISOString() };
    await saveAdminSession(nextSession);
    setSession(nextSession);
  };

  const handleLogout = async () => {
    await clearAdminSession();
    setSession(null);
  };

  if (checkingSession) {
    return (
      <SafeAreaProvider>
        <View className="flex-1 bg-white items-center justify-center">
          <ActivityIndicator color="#00B5B0" />
          <Text className="text-muted mt-3">Loading admin...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? (
            <>
              <Stack.Screen name="Login">
                {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
              </Stack.Screen>
              <Stack.Screen name="DeliveryLogin" component={DeliveryLoginScreen} />
              <Stack.Screen name="DeliveryDashboard" component={DeliveryDashboardScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="AdminTabs">
                {(props) => <TabNavigator {...props} onLogout={handleLogout} />}
              </Stack.Screen>
              <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
              <Stack.Screen name="ReturnRequests" component={ReturnRequestsScreen} />
              <Stack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} />
              <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
              <Stack.Screen name="DeliveryBoys" component={DeliveryBoysScreen} />
              <Stack.Screen name="DeliveryLogin" component={DeliveryLoginScreen} />
              <Stack.Screen name="DeliveryDashboard" component={DeliveryDashboardScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

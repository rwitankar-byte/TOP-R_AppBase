import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import CartScreen from "../screens/CartScreen";
import HomeScreen from "../screens/HomeScreen";
import ProductsScreen from "../screens/ProductsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SubscriptionsScreen from "../screens/SubscriptionsScreen";

const Tab = createBottomTabNavigator();

const iconMap = {
  Home: "home",
  Products: "water",
  Subscriptions: "calendar",
  Cart: "cart",
  Profile: "person"
};

export default function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: "#00B5B0", height: 64, paddingBottom: 8, paddingTop: 8 },
        tabBarActiveTintColor: "#FFD700",
        tabBarInactiveTintColor: "#FFFFFF",
        tabBarLabelStyle: { fontWeight: "700", fontSize: 11 },
        tabBarIcon: ({ color, size }) => <Ionicons name={iconMap[route.name]} size={size} color={color} />
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Products" component={ProductsScreen} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

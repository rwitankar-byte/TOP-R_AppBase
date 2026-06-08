import { Alert, Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device.");
      return null;
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    let status = existingPermission.status;
    if (status !== "granted") {
      const requestedPermission = await Notifications.requestPermissionsAsync();
      status = requestedPermission.status;
    }

    if (status !== "granted") {
      console.log("Push notification permission denied.");
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      Constants.expoConfig?.extra?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#00B5B0"
      });
    }

    return tokenData.data;
  } catch (error) {
    console.log("Push notification registration failed:", error.message);
    Alert.alert("Notifications", "Push notifications could not be enabled on this device.");
    return null;
  }
}

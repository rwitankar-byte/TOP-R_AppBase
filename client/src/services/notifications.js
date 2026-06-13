import { Platform } from "react-native";

function loadNotificationModules() {
  try {
    const Constants = require("expo-constants").default;
    const Device = require("expo-device");
    const Notifications = require("expo-notifications");

    Notifications.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true
      })
    });

    return { Constants, Device, Notifications };
  } catch (error) {
    console.log("Push notifications unavailable:", error.message);
    return null;
  }
}

export async function registerForPushNotifications() {
  try {
    const modules = loadNotificationModules();
    if (!modules) return null;

    const { Constants, Device, Notifications } = modules;
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
    return null;
  }
}

export function addForegroundNotificationListener(onNotification) {
  try {
    const modules = loadNotificationModules();
    if (!modules) return null;

    return modules.Notifications.addNotificationReceivedListener?.(onNotification) || null;
  } catch (error) {
    console.log("Foreground notification listener unavailable:", error.message);
    return null;
  }
}

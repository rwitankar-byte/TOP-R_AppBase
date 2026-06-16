export const Accuracy = {};
export const PermissionStatus = {
  DENIED: "denied",
  GRANTED: "granted",
  UNDETERMINED: "undetermined"
};

export async function requestForegroundPermissionsAsync() {
  return { status: PermissionStatus.DENIED, granted: false, canAskAgain: false };
}

export async function getForegroundPermissionsAsync() {
  return { status: PermissionStatus.DENIED, granted: false, canAskAgain: false };
}

export async function getCurrentPositionAsync() {
  return null;
}

export async function reverseGeocodeAsync() {
  return [];
}

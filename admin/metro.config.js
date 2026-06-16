const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "expo-location": path.resolve(__dirname, "src/services/optionalLocation.js")
};

module.exports = config;

// Expo SDK 57 detects the pnpm monorepo automatically (watchFolders + nodeModulesPaths),
// so `@a2n/ui-tokens` (packages/ui-tokens) resolves without extra config.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./src/global.css" });

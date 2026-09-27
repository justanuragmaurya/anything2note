/**
 * NativeWind v4, composed by hand instead of `presets: ["nativewind/babel"]`: that preset
 * also adds `react-native-reanimated/plugin`, but babel-preset-expo already injects
 * `react-native-worklets/plugin`, so the worklet transform would run twice.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [require("react-native-css-interop/dist/babel-plugin").default],
  };
};

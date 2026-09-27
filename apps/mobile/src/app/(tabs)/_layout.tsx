import { Tabs } from "expo-router/js-tabs";
import { TabBar } from "@/components/navigation/TabBar";
import { palette } from "@/theme";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.paper },
        animation: "shift",
      }}
    >
      <Tabs.Screen name="library" />
      <Tabs.Screen name="review" />
      {/* Hero action sits in the middle of the bar. */}
      <Tabs.Screen name="add" />
      <Tabs.Screen name="actions" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

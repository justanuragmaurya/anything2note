import { ActionSheetIOS, Alert, Platform } from "react-native";

export type MenuOption = { label: string; onPress: () => void; destructive?: boolean };

/** Native action sheet on iOS, a button alert elsewhere. */
export function showMenu(title: string | undefined, options: MenuOption[]) {
  if (Platform.OS === "ios") {
    const labels = [...options.map((o) => o.label), "Cancel"];
    const destructive = options.findIndex((o) => o.destructive);
    ActionSheetIOS.showActionSheetWithOptions(
      { title, options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: destructive >= 0 ? destructive : undefined },
      (i) => options[i]?.onPress(),
    );
    return;
  }
  Alert.alert(title ?? "", undefined, [
    ...options.map((o) => ({ text: o.label, onPress: o.onPress, style: o.destructive ? ("destructive" as const) : ("default" as const) })),
    { text: "Cancel", style: "cancel" as const },
  ]);
}

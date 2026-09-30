import { useCallback, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Label, PressableScale } from "@/components/ui";
import { showMenu, type MenuOption } from "@/lib/menu";
import { palette } from "@/theme";
import { Sheet } from "./Sheet";

type Menu = { title?: string; options: MenuOption[] };

/**
 * The item screen's menus: the native action sheet on iOS, a bottom sheet on Android (an Alert
 * there holds at most three buttons). Render `menu` once; call `open` from any handler.
 */
export function useActionMenu() {
  const [current, setCurrent] = useState<Menu | null>(null);
  const open = useCallback((title: string | undefined, options: MenuOption[]) => {
    if (Platform.OS === "ios") showMenu(title, options);
    else setCurrent({ title, options });
  }, []);
  const close = () => setCurrent(null);
  const menu = (
    <Sheet visible={!!current} onClose={close} title={current?.title ?? "Options"}>
      <View style={styles.list}>
        {current?.options.map((o, i) => (
          <PressableScale
            key={o.label}
            onPress={() => {
              close();
              o.onPress();
            }}
            haptics="select"
            style={[styles.row, i > 0 && styles.rule]}
            accessibilityRole="button"
          >
            <Label style={{ color: o.destructive ? palette.red600 : palette.ink }}>{o.label}</Label>
          </PressableScale>
        ))}
      </View>
    </Sheet>
  );
  return { menu, open };
}

const styles = StyleSheet.create({
  list: { borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card, overflow: "hidden" },
  row: { paddingHorizontal: 16, paddingVertical: 15 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.lineStrong },
});

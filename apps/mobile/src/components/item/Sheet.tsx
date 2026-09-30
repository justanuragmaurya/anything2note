import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Eyebrow, H, Icon, PressableScale, Small } from "@/components/ui";
import { fontFamily, palette } from "@/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  /** Pinned under the scrolling body (Save / Cancel). */
  footer?: ReactNode;
};

/**
 * Bottom sheet over a dimmed screen, the same on iOS and Android (editors, pickers, prompts).
 * The header and footer stay put; only the body scrolls.
 */
export function Sheet({ visible, onClose, title, eyebrow, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
        <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        <View style={styles.fill} pointerEvents="box-none">
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(220)}
            style={[styles.panel, { maxHeight: height - insets.top - 24, paddingBottom: footer ? 0 : insets.bottom + 8 }]}
          >
            <View style={styles.grabber} />
            <View style={styles.head}>
              <View style={{ flex: 1, gap: 4 }}>
                {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
                <H level={3}>{title}</H>
              </View>
              <PressableScale onPress={onClose} hitSlop={10} accessibilityLabel="Close" style={styles.close}>
                <Icon name="close" size={13} color={palette.ink} weight="semibold" />
              </PressableScale>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body} style={{ flexGrow: 0 }}>
              {children}
            </ScrollView>
            {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A labelled group inside a sheet. */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Eyebrow>{label}</Eyebrow>
      {children}
      {hint ? <Small style={{ fontSize: 12 }}>{hint}</Small> : null}
    </View>
  );
}

/** Paper text field used across the sheets. */
export function Input({ style, multiline, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={palette.muted}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      {...rest}
      style={[styles.input, multiline && styles.multiline, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 20,
    color: palette.ink,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  multiline: { minHeight: 84, paddingTop: 11 },
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1, backgroundColor: "rgba(22,18,18,0.45)" },
  panel: {
    backgroundColor: palette.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: palette.lineStrong, marginTop: 8 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.lineStrong, backgroundColor: palette.card },
  body: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.lineStrong,
    backgroundColor: palette.paper,
  },
});

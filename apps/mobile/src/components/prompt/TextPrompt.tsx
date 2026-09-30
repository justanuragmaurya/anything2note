import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Body, Button, H, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { fontFamily, palette } from "@/theme";

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  confirmLabel: string;
  destructive?: boolean;
  /** The confirm button stays disabled until this passes (default: something typed) */
  valid?: (value: string) => boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  /** Resolve to close; reject to show the error and keep the prompt open */
  onSubmit: (value: string) => Promise<unknown>;
  onClose: () => void;
};

/** A small centred dialog with one text field (Alert.prompt is iOS-only). */
export function TextPrompt({ visible, title, message, placeholder, confirmLabel, destructive, valid, autoCapitalize = "sentences", onSubmit, onClose }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Starts empty next time it opens.
  const close = () => {
    setValue("");
    setError(null);
    onClose();
  };

  const ok = valid ? valid(value) : value.trim().length > 0;

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(value.trim());
      close();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : close} accessibilityLabel="Close" />
        <View style={styles.card}>
          <H level={3}>{title}</H>
          {message ? <Body style={{ fontSize: 14 }}>{message}</Body> : null}
          <TextInput
            autoFocus
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setError(null);
            }}
            placeholder={placeholder}
            placeholderTextColor={palette.muted}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void submit()}
            editable={!busy}
            style={styles.input}
          />
          {error ? <Small style={{ color: palette.red600 }}>{error}</Small> : null}
          <View style={styles.actions}>
            <Button variant="ghost" size="sm" onPress={close} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" variant={destructive ? "red" : "ink"} onPress={() => void submit()} disabled={!ok} loading={busy}>
              {confirmLabel}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "rgba(22,18,18,0.45)" },
  card: { gap: 12, padding: 20, borderRadius: 26, backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line },
  input: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    color: palette.ink,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: palette.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
});

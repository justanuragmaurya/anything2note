import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Eyebrow, Icon, PressableScale } from "@/components/ui";
import { palette } from "@/theme";
import { Field, Input, Sheet } from "./Sheet";

/** Marks an output this user edited or regenerated; everyone else still sees the shared one. */
export function YourVersionBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="Your version">
      <Icon name="person" size={10} color={palette.red700} />
      <Eyebrow color={palette.red700}>Your version</Eyebrow>
    </View>
  );
}

/** Above each output: the badge on the left, Edit and the output's own menu on the right. */
export function OutputToolbar({ custom, onEdit, onMore }: { custom?: boolean; onEdit?: () => void; onMore?: () => void }) {
  return (
    <View style={styles.bar}>
      {custom ? <YourVersionBadge /> : <View />}
      <View style={styles.actions}>
        {onEdit ? (
          <Button variant="ghost" size="sm" leadingIcon="edit" onPress={onEdit}>
            Edit
          </Button>
        ) : null}
        {onMore ? (
          <PressableScale onPress={onMore} hitSlop={8} accessibilityLabel="Output options" style={styles.more}>
            <Icon name="more" size={15} color={palette.ink} />
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

/** Asks for optional steering, then writes a fresh version for this user. Mount it to open it. */
export function RegenerateSheet({ label, onClose, onRegenerate }: { label: string; onClose: () => void; onRegenerate: (instructions?: string) => void }) {
  const [instructions, setInstructions] = useState("");
  const go = () => {
    onRegenerate(instructions.trim() || undefined);
    onClose();
  };
  return (
    <Sheet
      visible
      onClose={onClose}
      title={`Regenerate ${label.toLowerCase()}`}
      eyebrow="Free · a fresh version just for you"
      footer={
        <>
          <Button variant="ghost" size="sm" onPress={onClose}>
            Cancel
          </Button>
          <Button variant="red" size="sm" leadingIcon="sparkles" onPress={go}>
            Regenerate
          </Button>
        </>
      }
    >
      <Field label="Instructions (optional)" hint="Your current version stays on screen until the new one is written.">
        <Input
          value={instructions}
          onChangeText={setInstructions}
          multiline
          maxLength={1000}
          autoFocus
          placeholder="e.g. Shorter, focus on the proofs, add worked examples"
          accessibilityLabel="Instructions"
        />
      </Field>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, minHeight: 36 },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  more: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: palette.lineStrong },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.red200,
    backgroundColor: palette.red50,
  },
});

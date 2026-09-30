import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import type { ItemDetail, LibraryItem, OutputKey } from "@a2n/shared";
import { Body, Button, Chip, Eyebrow, Icon, Label, Mono, PressableScale, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { shareLink } from "@/lib/export";
import { fmtDay } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { NOTE_TYPES, OUTPUT_LABELS, noteType, type NoteType } from "@/lib/note-types";
import { useAddOutputs, useChangeNoteType, useRenameItem, useShareItem, useStopSharing } from "@/lib/queries";
import { palette } from "@/theme";
import { Field, Input, Sheet } from "./Sheet";

/* ───────────── Rename (cross-platform; Alert.prompt is iOS-only) ───────────── */

export function RenameSheet({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const rename = useRenameItem();
  const [title, setTitle] = useState(item.title);
  const next = title.trim();
  const save = () => {
    if (!next || next === item.title) return onClose();
    rename.mutate({ id: item.id, title: next }, { onSuccess: onClose, onError: (e) => Alert.alert("Couldn't rename", errorMessage(e)) });
  };
  return (
    <Sheet
      visible
      onClose={onClose}
      title="Rename"
      footer={
        <>
          <Button variant="ghost" size="sm" onPress={onClose}>
            Cancel
          </Button>
          <Button variant="ink" size="sm" loading={rename.isPending} disabled={!next} onPress={save}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Title">
        <Input value={title} onChangeText={setTitle} autoFocus selectTextOnFocus maxLength={200} returnKeyType="done" onSubmitEditing={save} accessibilityLabel="Title" />
      </Field>
    </Sheet>
  );
}

/* ───────────── Share link ───────────── */

/** Create, copy, share or stop the item's read-only link (`ItemDetail.share`). */
export function ShareSheet({ detail, onClose }: { detail: ItemDetail; onClose: () => void }) {
  const create = useShareItem(detail.item.id);
  const stop = useStopSharing(detail.item.id);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const t = timer;
    return () => {
      if (t.current) clearTimeout(t.current);
    };
  }, []);
  const share = detail.share;

  const copy = async (url: string) => {
    await Clipboard.setStringAsync(url);
    haptic.success();
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  const confirmStop = () =>
    Alert.alert("Stop sharing?", "The link stops working for everyone who has it. You can make a new one later.", [
      { text: "Cancel", style: "cancel" },
      { text: "Stop sharing", style: "destructive", onPress: () => stop.mutate(undefined, { onError: (e) => Alert.alert("Couldn't stop sharing", errorMessage(e)) }) },
    ]);

  return (
    <Sheet visible onClose={onClose} title="Share link" eyebrow="Read-only">
      <Body style={{ fontSize: 14 }}>Anyone with the link can read this item&apos;s notes. They can&apos;t see your chat or change anything.</Body>
      {share ? (
        <>
          <View style={styles.link}>
            <Icon name="link" size={14} color={palette.red600} />
            <Mono selectable numberOfLines={2} style={{ flex: 1, color: palette.ink, fontSize: 13 }}>
              {share.url}
            </Mono>
          </View>
          <View style={styles.row}>
            <Button variant="ink" size="sm" leadingIcon={copied ? "check" : "copy"} onPress={() => void copy(share.url)}>
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button variant="ghost" size="sm" leadingIcon="share" onPress={() => void shareLink(share.url, detail.item.title)}>
              Share…
            </Button>
          </View>
          <View style={[styles.row, { justifyContent: "space-between", alignItems: "center" }]}>
            <Small>Shared {fmtDay(share.createdAt).toLowerCase()}</Small>
            <PressableScale onPress={confirmStop} disabled={stop.isPending} haptics="tap" hitSlop={8} accessibilityRole="button">
              <Label style={{ color: palette.red600, fontSize: 14 }}>{stop.isPending ? "Stopping…" : "Stop sharing"}</Label>
            </PressableScale>
          </View>
        </>
      ) : (
        <View style={{ gap: 10 }}>
          <Button
            variant="red"
            leadingIcon="link"
            loading={create.isPending}
            onPress={() =>
              create.mutate(undefined, {
                onSuccess: ({ share: s }) => void copy(s.url),
              })
            }
          >
            Create link
          </Button>
          {create.isError ? <Small style={{ color: palette.red600 }}>{errorMessage(create.error)}</Small> : null}
        </View>
      )}
    </Sheet>
  );
}

/* ───────────── Add output ───────────── */

/** Outputs this note type can make that the item doesn't have yet. */
export const addableOutputs = (item: LibraryItem): OutputKey[] => {
  const nt = noteType(item.noteType);
  return [...new Set([...nt.defaults, ...nt.optional])].filter((k) => !item.outputs.includes(k));
};

export function AddOutputSheet({ item, onClose, onAdded }: { item: LibraryItem; onClose: () => void; onAdded: (first: OutputKey) => void }) {
  const add = useAddOutputs(item.id);
  const options = addableOutputs(item);
  const [picked, setPicked] = useState<OutputKey[]>([]);
  const toggle = (k: OutputKey) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const go = () =>
    add.mutate(picked, {
      onSuccess: () => {
        haptic.success();
        onAdded(picked[0]!);
        onClose();
      },
    });
  return (
    <Sheet
      visible
      onClose={onClose}
      title="Add outputs"
      eyebrow={`${noteType(item.noteType).label} · free, no extra credits`}
      footer={
        <>
          <Button variant="ghost" size="sm" onPress={onClose}>
            Cancel
          </Button>
          <Button variant="red" size="sm" leadingIcon="add" loading={add.isPending} disabled={!picked.length} onPress={go}>
            {picked.length > 1 ? `Add ${picked.length}` : "Add"}
          </Button>
        </>
      }
    >
      {options.length ? (
        <View style={styles.chips}>
          {options.map((k) => (
            <Chip key={k} label={OUTPUT_LABELS[k]} active={picked.includes(k)} icon={picked.includes(k) ? "check" : "add"} onPress={() => toggle(k)} />
          ))}
        </View>
      ) : (
        <Body>Every output this note type makes is already here.</Body>
      )}
      {add.isError ? <Small style={{ color: palette.red600 }}>{errorMessage(add.error)}</Small> : null}
    </Sheet>
  );
}

/* ───────────── Change note type ───────────── */

function TypeRow({ type, current, onPress }: { type: NoteType; current: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={current ? undefined : onPress} haptics={current ? false : "select"} style={[styles.type, current && styles.typeCurrent]} accessibilityRole="button" accessibilityState={{ selected: current }}>
      <View style={[styles.swatch, { backgroundColor: type.color }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Label>{type.label}</Label>
        <Small numberOfLines={2}>{type.defaults.map((k) => OUTPUT_LABELS[k]).join(" · ")}</Small>
      </View>
      {current ? <Eyebrow color={palette.red600}>Current</Eyebrow> : <Icon name="forward" size={13} color={palette.muted} />}
    </PressableScale>
  );
}

/** Switching type swaps the item's outputs for that type's set; missing ones are written for free. */
export function NoteTypeSheet({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const change = useChangeNoteType(item.id);
  const pick = (t: NoteType) =>
    Alert.alert(
      `Switch to ${t.label}?`,
      `Its tabs become: ${t.defaults.map((k) => OUTPUT_LABELS[k]).join(", ")}. Any that are missing are written now, at no extra cost.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          onPress: () =>
            change.mutate(t.key, {
              onSuccess: () => {
                haptic.success();
                onClose();
              },
              onError: (e) => Alert.alert("Couldn't switch", errorMessage(e)),
            }),
        },
      ],
    );
  return (
    <Sheet visible onClose={onClose} title="Change note type" eyebrow={change.isPending ? "Switching…" : "What kind of source is this?"}>
      <View style={{ gap: 8 }}>
        {NOTE_TYPES.map((t) => (
          <TypeRow key={t.key} type={t} current={t.key === item.noteType} onPress={() => pick(t)} />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: palette.red200, backgroundColor: palette.red50 },
  row: { flexDirection: "row", gap: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card },
  typeCurrent: { borderColor: palette.ink },
  swatch: { width: 14, height: 38, borderRadius: 4 },
});

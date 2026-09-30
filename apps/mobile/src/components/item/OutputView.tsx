import { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import type { ItemDetail, OutputData, OutputKey, Task } from "@a2n/shared";
import { TaskEditSheet } from "@/components/tasks/TaskEditSheet";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Body, Button, Eyebrow, Skeleton, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { OUTPUT_LABELS, noteType } from "@/lib/note-types";
import { useEditTask, useRegenerateOutput, useResetOutput, useRetryItem, useToggleTask } from "@/lib/queries";
import { palette } from "@/theme";
import { useActionMenu } from "./ActionMenu";
import { OutputEditor } from "./OutputEditor";
import { OutputToolbar, RegenerateSheet } from "./OutputActions";
import { Deck } from "./renderers/Deck";
import { Quiz } from "./renderers/Quiz";
import { Generic, Notes, Summary } from "./renderers/Structured";

function Tasks({ data, itemId, source }: { data: Extract<OutputData, { type: "tasks" }>; itemId: string; source: string }) {
  const toggle = useToggleTask();
  const editTask = useEditTask();
  const [editing, setEditing] = useState<Task | null>(null);
  if (!data.items.length) return <Body>No homework, readings or deadlines were mentioned.</Body>;
  return (
    <View style={{ gap: 8 }}>
      {data.items.map((t) => (
        <TaskRow key={t.id} item={t} onToggle={() => toggle.mutate({ id: t.id, done: !t.done, itemId })} showSource={false} onEdit={() => setEditing(t)} />
      ))}
      {toggle.isError ? <Small style={{ color: palette.red600 }}>Couldn&apos;t save that tick: {errorMessage(toggle.error)}</Small> : null}
      {editTask.isError ? <Small style={{ color: palette.red600 }}>Couldn&apos;t save that change: {errorMessage(editTask.error)}</Small> : null}
      {editing ? (
        <TaskEditSheet
          task={editing}
          source={source}
          onClose={() => setEditing(null)}
          onSave={(patch) => editTask.mutate({ id: editing.id, patch, itemId })}
        />
      ) : null}
    </View>
  );
}

function Content({ data, output, detail }: { data: OutputData; output: OutputKey; detail: ItemDetail }) {
  switch (data.type) {
    case "tasks":
      return <Tasks data={data} itemId={detail.item.id} source={detail.item.title} />;
    case "notes":
      return <Notes data={data} />;
    case "flashcards":
      return <Deck cards={data.cards} source={detail.item.title} tint={noteType(detail.item.noteType).color} />;
    case "quiz":
      return <Quiz questions={data.questions} itemId={detail.item.id} output={output} />;
    case "summary":
      return <Summary data={data} />;
    case "generic":
      return <Generic data={data} output={output} />;
  }
}

/**
 * Renders one output of an item as the API reports it: written, being (re)written, failed, or not
 * made, with its actions: edit, regenerate, and back to the shared version when it's the user's own.
 */
export function OutputView({ output, detail }: { output: OutputKey; detail: ItemDetail }) {
  const entry = detail.outputs[output];
  const itemId = detail.item.id;
  const retry = useRetryItem();
  const regenerate = useRegenerateOutput(itemId);
  const reset = useResetOutput(itemId);
  const { menu, open } = useActionMenu();
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const label = OUTPUT_LABELS[output];
  const busy = entry?.status === "queued" || entry?.status === "running";

  const confirmReset = () =>
    Alert.alert("Go back to the shared version?", `Your edits to the ${label.toLowerCase()} are dropped.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => reset.mutate(output, { onError: (e) => Alert.alert("Couldn't reset", errorMessage(e)) }) },
    ]);

  const more = () =>
    open(label, [
      { label: "Regenerate…", onPress: () => setRegenerating(true) },
      ...(entry?.custom ? [{ label: "Reset to shared version", destructive: true, onPress: confirmReset }] : []),
    ]);

  const sheets = (
    <>
      {menu}
      {editing && entry?.data ? <OutputEditor itemId={itemId} output={output} data={entry.data} onClose={() => setEditing(false)} /> : null}
      {regenerating ? (
        <RegenerateSheet
          label={label}
          onClose={() => setRegenerating(false)}
          onRegenerate={(instructions) => regenerate.mutate({ output, instructions }, { onError: (e) => Alert.alert("Couldn't regenerate", errorMessage(e)) })}
        />
      ) : null}
    </>
  );

  if (entry?.status === "ready" && entry.data) {
    return (
      <View>
        <OutputToolbar custom={entry.custom} onEdit={() => setEditing(true)} onMore={more} />
        {reset.isPending ? <Small style={{ marginBottom: 10 }}>Going back to the shared version…</Small> : null}
        <Content data={entry.data} output={output} detail={detail} />
        {sheets}
      </View>
    );
  }

  // Being rewritten (regenerate, note-type switch): the old version stays, dimmed, until the new one lands.
  if (busy && entry?.data) {
    return (
      <View>
        <View style={styles.banner}>
          <ActivityIndicator size="small" color={palette.red500} />
          <Eyebrow style={{ flex: 1 }}>{entry?.status === "running" ? `Rewriting ${label.toLowerCase()}…` : `${label} · queued for a rewrite`}</Eyebrow>
        </View>
        <View style={{ opacity: 0.45 }} pointerEvents="none">
          <Content data={entry.data} output={output} detail={detail} />
        </View>
      </View>
    );
  }

  if (entry?.status === "failed") {
    return (
      <View>
        <View style={styles.empty}>
          <Eyebrow color={palette.red600}>{label}</Eyebrow>
          <Body style={{ fontSize: 14, marginTop: 8 }}>{entry.error ?? "This output couldn't be written."}</Body>
          {retry.isError ? <Small style={{ color: palette.red600, marginTop: 8 }}>{errorMessage(retry.error)}</Small> : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Button size="sm" variant="ink" leadingIcon="retry" loading={retry.isPending} onPress={() => retry.mutate(itemId)}>
              Try again
            </Button>
            <Button size="sm" variant="ghost" leadingIcon="sparkles" onPress={() => setRegenerating(true)}>
              With instructions
            </Button>
          </View>
        </View>
        {/* A failed rewrite of an output that had been written: the last good version is still there. */}
        {entry.data ? (
          <View style={{ marginTop: 18 }}>
            <OutputToolbar custom={entry.custom} onEdit={() => setEditing(true)} onMore={more} />
            <Content data={entry.data} output={output} detail={detail} />
          </View>
        ) : null}
        {sheets}
      </View>
    );
  }

  if (busy || (!entry && detail.item.status.state !== "ready" && detail.item.status.state !== "failed")) {
    return (
      <View style={styles.empty}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {entry?.status === "running" ? <ActivityIndicator size="small" color={palette.red500} /> : null}
          <Eyebrow>{entry?.status === "running" ? `Writing ${label.toLowerCase()}…` : `${label} · queued`}</Eyebrow>
        </View>
        <View style={{ gap: 8, marginTop: 16 }}>
          <Skeleton width="92%" />
          <Skeleton width="78%" />
          <Skeleton width="85%" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.empty}>
      <Eyebrow>{label}</Eyebrow>
      <Body style={{ fontSize: 14, marginTop: 8 }}>This output wasn&apos;t made for this item.</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 18, borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: palette.lineStrong },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, backgroundColor: palette.red50, borderWidth: 1, borderColor: palette.red100, marginBottom: 16 },
});

import { ActivityIndicator, StyleSheet, View } from "react-native";
import type { ItemDetail, OutputData, OutputKey } from "@a2n/shared";
import { TaskRow } from "@/components/tasks/TaskRow";
import { Body, Button, Eyebrow, Skeleton, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { OUTPUT_LABELS, noteType } from "@/lib/note-types";
import { useRetryItem, useToggleTask } from "@/lib/queries";
import { palette } from "@/theme";
import { Deck } from "./renderers/Deck";
import { Quiz } from "./renderers/Quiz";
import { Generic, Notes, Summary } from "./renderers/Structured";

function Tasks({ data, itemId }: { data: Extract<OutputData, { type: "tasks" }>; itemId: string }) {
  const toggle = useToggleTask();
  if (!data.items.length) return <Body>No homework, readings or deadlines were mentioned.</Body>;
  return (
    <View style={{ gap: 8 }}>
      {data.items.map((t) => (
        <TaskRow key={t.id} item={t} onToggle={() => toggle.mutate({ id: t.id, done: !t.done, itemId })} showSource={false} />
      ))}
      {toggle.isError ? <Small style={{ color: palette.red600 }}>Couldn&apos;t save that tick: {errorMessage(toggle.error)}</Small> : null}
    </View>
  );
}

function Content({ data, output, detail }: { data: OutputData; output: OutputKey; detail: ItemDetail }) {
  switch (data.type) {
    case "tasks":
      return <Tasks data={data} itemId={detail.item.id} />;
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

/** Renders one output of an item as the API reports it: written, still being written, failed, or not made. */
export function OutputView({ output, detail }: { output: OutputKey; detail: ItemDetail }) {
  const entry = detail.outputs[output];
  const retry = useRetryItem();
  const label = OUTPUT_LABELS[output];

  if (entry?.status === "ready" && entry.data) return <Content data={entry.data} output={output} detail={detail} />;

  if (entry?.status === "failed") {
    return (
      <View style={styles.empty}>
        <Eyebrow color={palette.red600}>{label}</Eyebrow>
        <Body style={{ fontSize: 14, marginTop: 8 }}>{entry.error ?? "This output couldn't be written."}</Body>
        {retry.isError ? <Small style={{ color: palette.red600, marginTop: 8 }}>{errorMessage(retry.error)}</Small> : null}
        <Button size="sm" variant="ink" leadingIcon="retry" style={{ marginTop: 14 }} loading={retry.isPending} onPress={() => retry.mutate(detail.item.id)}>
          Try again
        </Button>
      </View>
    );
  }

  if (entry?.status === "queued" || entry?.status === "running" || (!entry && detail.item.status.state !== "ready" && detail.item.status.state !== "failed")) {
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
});

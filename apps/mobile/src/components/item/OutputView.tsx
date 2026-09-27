import { StyleSheet, View } from "react-native";
import { ActionRow } from "@/components/actions/ActionRow";
import { Body, Button, Eyebrow, Skeleton } from "@/components/ui";
import { actionsStore, useActions } from "@/lib/actions-store";
import type { Item, OutputContent } from "@/lib/mock/types";
import { OUTPUT_LABELS, type OutputKey } from "@/lib/note-types";
import { palette } from "@/theme";
import { Deck } from "./renderers/Deck";
import { Quiz } from "./renderers/Quiz";
import { Bullets, Decisions, Glossary, Minutes, Notes, Summary } from "./renderers/Structured";

function Actions({ ids }: { ids: string[] }) {
  const all = useActions();
  const items = all.filter((a) => ids.includes(a.id));
  return (
    <View style={{ gap: 8 }}>
      {items.map((a) => (
        <ActionRow key={a.id} item={a} onToggle={() => actionsStore.toggle(a.id)} showSource={false} />
      ))}
    </View>
  );
}

function Content({ content, item }: { content: OutputContent; item: Item }) {
  switch (content.kind) {
    case "minutes":
      return <Minutes data={content} />;
    case "actions":
      return <Actions ids={content.items.map((a) => a.id)} />;
    case "decisions":
      return <Decisions data={content} />;
    case "notes":
      return <Notes data={content} />;
    case "flashcards":
      return <Deck cards={content.cards} source={item.title} />;
    case "quiz":
      return <Quiz questions={content.questions} />;
    case "bullets":
      return <Bullets data={content} />;
    case "glossary":
      return <Glossary data={content} />;
    case "summary":
      return <Summary data={content} />;
  }
}

/** Renders one registry output for an item, or a "not generated yet" state. */
export function OutputView({ output, item }: { output: OutputKey; item: Item }) {
  const content = item.outputs[output];
  if (content) return <Content content={content} item={item} />;
  return (
    <View style={styles.empty}>
      <Eyebrow>{OUTPUT_LABELS[output]}</Eyebrow>
      <View style={{ gap: 8, marginVertical: 16 }}>
        <Skeleton width="92%" />
        <Skeleton width="78%" />
        <Skeleton width="85%" />
      </View>
      <Body style={{ fontSize: 14 }}>This output wasn&apos;t generated for this item yet.</Body>
      <Button size="sm" variant="ink" icon="sparkles" style={{ marginTop: 14 }}>
        Generate now
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { padding: 18, borderRadius: 18, borderWidth: 1, borderStyle: "dashed", borderColor: palette.lineStrong },
});

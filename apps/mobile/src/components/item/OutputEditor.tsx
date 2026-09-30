import { useState, type ReactNode } from "react";
import { Alert, StyleSheet, View } from "react-native";
import type { Anchor, Flashcard, GenericBlock, NoteSection, OutputData, OutputKey, QuizQuestion, Task } from "@a2n/shared";
import { DueField, KindPicker, isIsoDay } from "@/components/tasks/TaskFields";
import { Button, Eyebrow, Icon, Mono, PressableScale, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { fmtAnchor } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { OUTPUT_LABELS } from "@/lib/note-types";
import { useEditOutput } from "@/lib/queries";
import { palette } from "@/theme";
import { Field, Input, Sheet } from "./Sheet";

type Of<K extends OutputData["type"]> = Extract<OutputData, { type: K }>;

/* ───────────── Validation: trims, drops blank rows, keeps ids and anchors ───────────── */

type Result = { data: OutputData } | { error: string };

const t = (s: string | undefined) => (s ?? "").trim();
const lines = (xs: string[] | undefined) => (xs ?? []).map(t).filter(Boolean);

let seq = 0;
/** Ids for rows added here; the API keeps or replaces them. */
const newId = (prefix: string) => `${prefix}-new-${Date.now().toString(36)}-${++seq}`;

function clean(d: OutputData): Result {
  switch (d.type) {
    case "notes": {
      const sections: NoteSection[] = [];
      for (const [i, s] of d.sections.entries()) {
        const body = lines(s.body);
        const bullets = lines(s.bullets);
        if (!t(s.heading) && !body.length && !bullets.length) continue;
        if (!t(s.heading)) return { error: `Section ${i + 1} needs a heading.` };
        sections.push({ ...s, heading: t(s.heading), body, bullets: bullets.length ? bullets : undefined });
      }
      return sections.length ? { data: { type: "notes", sections } } : { error: "Keep at least one section." };
    }
    case "summary": {
      if (!t(d.tldr)) return { error: "The TL;DR can't be empty." };
      return { data: { type: "summary", tldr: t(d.tldr), points: d.points.map((p) => ({ ...p, text: t(p.text) })).filter((p) => p.text) } };
    }
    case "flashcards": {
      const cards: Flashcard[] = [];
      for (const [i, c] of d.cards.entries()) {
        if (!t(c.front) && !t(c.back)) continue;
        if (!t(c.front) || !t(c.back)) return { error: `Card ${i + 1} needs both a front and a back.` };
        cards.push({ ...c, front: t(c.front), back: t(c.back), topic: t(c.topic) || "General" });
      }
      return cards.length ? { data: { type: "flashcards", cards } } : { error: "Keep at least one card." };
    }
    case "quiz": {
      const questions: QuizQuestion[] = [];
      for (const [i, q] of d.questions.entries()) {
        const n = i + 1;
        if (!t(q.q) && q.options.every((o) => !t(o)) && !t(q.explanation)) continue;
        if (!t(q.q)) return { error: `Question ${n} needs a question.` };
        // Blank options are dropped, so the correct answer's index moves with them.
        const kept = q.options.map((o, idx) => ({ o: t(o), idx })).filter((x) => x.o);
        if (kept.length < 2) return { error: `Question ${n} needs at least two answers.` };
        const correct = kept.findIndex((x) => x.idx === q.correct);
        if (correct < 0) return { error: `Mark the correct answer for question ${n}.` };
        if (!t(q.explanation)) return { error: `Question ${n} needs an explanation.` };
        questions.push({ ...q, q: t(q.q), options: kept.map((x) => x.o), correct, explanation: t(q.explanation), topic: t(q.topic) || "General" });
      }
      return questions.length ? { data: { type: "quiz", questions } } : { error: "Keep at least one question." };
    }
    case "tasks": {
      const items: Task[] = [];
      for (const [i, x] of d.items.entries()) {
        if (!t(x.task)) continue;
        if (x.due !== null && !isIsoDay(x.due)) return { error: `Task ${i + 1} has an invalid due date.` };
        items.push({ ...x, task: t(x.task) });
      }
      // An empty list is a real answer: "no tasks were mentioned".
      return { data: { type: "tasks", items } };
    }
    case "generic": {
      const blocks: GenericBlock[] = d.blocks
        .map((b) => ({ ...b, title: t(b.title) || undefined, text: t(b.text) }))
        .filter((b) => b.text || b.title);
      const untitled = blocks.findIndex((b) => !b.text);
      if (untitled >= 0) return { error: `Item ${untitled + 1} needs some text.` };
      return blocks.length ? { data: { type: "generic", intro: t(d.intro) || undefined, blocks } } : { error: "Keep at least one item." };
    }
  }
}

/* ───────────── Row list: numbered cards with remove, plus an add button ───────────── */

function Rows<T>({
  items,
  noun,
  onChange,
  make,
  anchorOf,
  children,
  min = 0,
}: {
  items: T[];
  noun: string;
  onChange: (items: T[]) => void;
  make: () => T;
  anchorOf: (item: T) => Anchor | undefined;
  children: (item: T, set: (patch: Partial<T>) => void, index: number) => ReactNode;
  min?: number;
}) {
  const set = (i: number) => (patch: Partial<T>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <View style={{ gap: 12 }}>
      {items.map((item, i) => {
        const anchor = anchorOf(item);
        return (
          <View key={i} style={styles.row}>
            <View style={styles.rowHead}>
              <Eyebrow style={{ flex: 1 }}>
                {noun} {i + 1}
                {anchor ? ` · ${fmtAnchor(anchor)}` : ""}
              </Eyebrow>
              {items.length > min ? (
                <PressableScale
                  onPress={() => onChange(items.filter((_, j) => j !== i))}
                  hitSlop={10}
                  haptics="tap"
                  accessibilityLabel={`Remove ${noun.toLowerCase()} ${i + 1}`}
                  style={styles.remove}
                >
                  <Icon name="trash" size={13} color={palette.muted} />
                </PressableScale>
              ) : null}
            </View>
            {children(item, set(i), i)}
          </View>
        );
      })}
      <Button variant="ghost" size="sm" leadingIcon="add" onPress={() => onChange([...items, make()])}>
        {`Add ${noun.toLowerCase()}`}
      </Button>
    </View>
  );
}

/** Multi-line field edited as one text; one line per paragraph / bullet. */
const splitLines = (s: string) => s.split("\n");

/* ───────────── One form per output shape ───────────── */

function NotesForm({ d, set }: { d: Of<"notes">; set: (d: Of<"notes">) => void }) {
  return (
    <Rows<NoteSection>
      items={d.sections}
      noun="Section"
      onChange={(sections) => set({ ...d, sections })}
      make={() => ({ heading: "", body: [""] })}
      anchorOf={(s) => s.anchor}
    >
      {(s, patch) => (
        <>
          <Input value={s.heading} onChangeText={(heading) => patch({ heading })} placeholder="Heading" accessibilityLabel="Section heading" />
          <Input
            value={s.body.join("\n")}
            onChangeText={(v) => patch({ body: splitLines(v) })}
            multiline
            scrollEnabled={false}
            placeholder="Paragraphs, one per line. Start a line with - for a bullet."
            accessibilityLabel="Section text"
          />
          <Input
            value={(s.bullets ?? []).join("\n")}
            onChangeText={(v) => patch({ bullets: splitLines(v) })}
            multiline
            scrollEnabled={false}
            placeholder="Key bullets, one per line (optional)"
            accessibilityLabel="Section bullets"
            style={{ minHeight: 60 }}
          />
        </>
      )}
    </Rows>
  );
}

function SummaryForm({ d, set }: { d: Of<"summary">; set: (d: Of<"summary">) => void }) {
  return (
    <>
      <Field label="TL;DR">
        <Input value={d.tldr} onChangeText={(tldr) => set({ ...d, tldr })} multiline scrollEnabled={false} placeholder="The whole thing in a sentence or two" />
      </Field>
      <Rows<Of<"summary">["points"][number]> items={d.points} noun="Point" onChange={(points) => set({ ...d, points })} make={() => ({ text: "" })} anchorOf={(p) => p.anchor}>
        {(p, patch) => <Input value={p.text} onChangeText={(text) => patch({ text })} multiline scrollEnabled={false} placeholder="Point" style={{ minHeight: 60 }} />}
      </Rows>
    </>
  );
}

function FlashcardsForm({ d, set }: { d: Of<"flashcards">; set: (d: Of<"flashcards">) => void }) {
  return (
    <>
      <Small>Edited cards start their review schedule again.</Small>
      <Rows<Flashcard>
        items={d.cards}
        noun="Card"
        onChange={(cards) => set({ ...d, cards })}
        make={() => ({ id: newId("card"), front: "", back: "", topic: d.cards[d.cards.length - 1]?.topic ?? "" })}
        anchorOf={(c) => c.anchor}
      >
        {(c, patch) => (
          <>
            <Input value={c.front} onChangeText={(front) => patch({ front })} multiline scrollEnabled={false} placeholder="Front: the question" style={{ minHeight: 56 }} />
            <Input value={c.back} onChangeText={(back) => patch({ back })} multiline scrollEnabled={false} placeholder="Back: the answer" style={{ minHeight: 56 }} />
            <Input value={c.topic} onChangeText={(topic) => patch({ topic })} placeholder="Topic" accessibilityLabel="Topic" />
          </>
        )}
      </Rows>
    </>
  );
}

function QuizForm({ d, set }: { d: Of<"quiz">; set: (d: Of<"quiz">) => void }) {
  return (
    <Rows<QuizQuestion>
      items={d.questions}
      noun="Question"
      onChange={(questions) => set({ ...d, questions })}
      make={() => ({ id: newId("q"), q: "", options: ["", "", "", ""], correct: 0, explanation: "", topic: d.questions[d.questions.length - 1]?.topic ?? "" })}
      anchorOf={(q) => q.anchor}
    >
      {(q, patch) => (
        <>
          <Input value={q.q} onChangeText={(v) => patch({ q: v })} multiline scrollEnabled={false} placeholder="Question" style={{ minHeight: 56 }} />
          <Eyebrow>Answers · tap the circle to mark the correct one</Eyebrow>
          {q.options.map((o, idx) => (
            <View key={idx} style={styles.option}>
              <PressableScale
                onPress={() => patch({ correct: idx })}
                haptics="select"
                hitSlop={8}
                accessibilityRole="radio"
                accessibilityState={{ checked: q.correct === idx }}
                accessibilityLabel={`Answer ${String.fromCharCode(65 + idx)} is correct`}
                style={[styles.radio, q.correct === idx && styles.radioOn]}
              >
                {q.correct === idx ? <Icon name="check" size={11} color={palette.cream} weight="bold" /> : null}
              </PressableScale>
              <Input
                value={o}
                onChangeText={(v) => patch({ options: q.options.map((x, j) => (j === idx ? v : x)) })}
                placeholder={`Answer ${String.fromCharCode(65 + idx)}`}
                style={{ flex: 1 }}
              />
              {q.options.length > 2 ? (
                <PressableScale
                  onPress={() =>
                    patch({
                      options: q.options.filter((_, j) => j !== idx),
                      correct: q.correct === idx ? 0 : q.correct > idx ? q.correct - 1 : q.correct,
                    })
                  }
                  hitSlop={8}
                  accessibilityLabel={`Remove answer ${String.fromCharCode(65 + idx)}`}
                  style={styles.remove}
                >
                  <Icon name="close" size={11} color={palette.muted} />
                </PressableScale>
              ) : null}
            </View>
          ))}
          {q.options.length < 6 ? (
            <Button variant="ghost" size="sm" leadingIcon="add" onPress={() => patch({ options: [...q.options, ""] })}>
              Add answer
            </Button>
          ) : null}
          <Input value={q.explanation} onChangeText={(explanation) => patch({ explanation })} multiline scrollEnabled={false} placeholder="Why that answer is right" style={{ minHeight: 56 }} />
          <Input value={q.topic} onChangeText={(topic) => patch({ topic })} placeholder="Topic" accessibilityLabel="Topic" />
        </>
      )}
    </Rows>
  );
}

function TasksForm({ d, set }: { d: Of<"tasks">; set: (d: Of<"tasks">) => void }) {
  return (
    <Rows<Task>
      items={d.items}
      noun="Task"
      onChange={(items) => set({ ...d, items })}
      make={() => ({ id: newId("task"), task: "", kind: "homework", due: null, done: false })}
      anchorOf={(x) => x.anchor}
    >
      {(x, patch) => (
        <>
          <Input value={x.task} onChangeText={(task) => patch({ task })} multiline scrollEnabled={false} placeholder="What needs doing?" style={{ minHeight: 56 }} />
          <KindPicker value={x.kind} onChange={(kind) => patch({ kind })} />
          <DueField value={x.due} onChange={(due) => patch({ due })} />
        </>
      )}
    </Rows>
  );
}

function GenericForm({ d, set }: { d: Of<"generic">; set: (d: Of<"generic">) => void }) {
  return (
    <>
      <Field label="Intro (optional)">
        <Input value={d.intro ?? ""} onChangeText={(intro) => set({ ...d, intro })} multiline scrollEnabled={false} placeholder="A line to open with" style={{ minHeight: 56 }} />
      </Field>
      <Rows<GenericBlock> items={d.blocks} noun="Item" onChange={(blocks) => set({ ...d, blocks })} make={() => ({ title: "", text: "" })} anchorOf={(b) => b.anchor}>
        {(b, patch) => (
          <>
            <Input value={b.title ?? ""} onChangeText={(title) => patch({ title })} placeholder="Title (optional)" accessibilityLabel="Title" />
            <Input value={b.text} onChangeText={(text) => patch({ text })} multiline scrollEnabled={false} placeholder="Text" style={{ minHeight: 60 }} />
          </>
        )}
      </Rows>
    </>
  );
}

function Form({ draft, setDraft }: { draft: OutputData; setDraft: (d: OutputData) => void }) {
  switch (draft.type) {
    case "notes":
      return <NotesForm d={draft} set={setDraft} />;
    case "summary":
      return <SummaryForm d={draft} set={setDraft} />;
    case "flashcards":
      return <FlashcardsForm d={draft} set={setDraft} />;
    case "quiz":
      return <QuizForm d={draft} set={setDraft} />;
    case "tasks":
      return <TasksForm d={draft} set={setDraft} />;
    case "generic":
      return <GenericForm d={draft} set={setDraft} />;
  }
}

/**
 * Edit one output by hand. Saving makes it this user's own copy (others keep the shared one);
 * anchors and ids of existing rows are kept. Mount it to open it.
 */
export function OutputEditor({ itemId, output, data, onClose }: { itemId: string; output: OutputKey; data: OutputData; onClose: () => void }) {
  const edit = useEditOutput(itemId);
  const [draft, setDraft] = useState<OutputData>(data);
  const [error, setError] = useState<string | null>(null);
  const dirty = draft !== data;
  const label = OUTPUT_LABELS[output];

  const save = () => {
    const r = clean(draft);
    if ("error" in r) {
      haptic.warn();
      return setError(r.error);
    }
    setError(null);
    edit.mutate(
      { output, data: r.data },
      {
        onSuccess: () => {
          haptic.success();
          onClose();
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  const close = () => {
    if (!dirty || edit.isPending) return onClose();
    Alert.alert("Discard your changes?", undefined, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onClose },
    ]);
  };

  return (
    <Sheet
      visible
      onClose={close}
      title={`Edit ${label.toLowerCase()}`}
      eyebrow="Your own copy · others keep the original"
      footer={
        <>
          {error ? (
            <Small numberOfLines={2} style={{ flex: 1, alignSelf: "center", color: palette.red600 }}>
              {error}
            </Small>
          ) : null}
          <Button variant="ghost" size="sm" onPress={close}>
            Cancel
          </Button>
          <Button variant="ink" size="sm" loading={edit.isPending} disabled={!dirty} onPress={save}>
            Save
          </Button>
        </>
      }
    >
      <Form
        draft={draft}
        setDraft={(d) => {
          setDraft(d);
          if (error) setError(null);
        }}
      />
      <Mono style={{ fontSize: 11 }}>Timestamps and page links stay attached to the rows they came with.</Mono>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.panel },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  remove: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: palette.card },
  option: { flexDirection: "row", alignItems: "center", gap: 8 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: palette.lineStrong, alignItems: "center", justifyContent: "center", backgroundColor: palette.card },
  radioOn: { backgroundColor: palette.success, borderColor: palette.success },
});

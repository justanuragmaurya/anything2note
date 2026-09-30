import { useState } from "react";
import { Alert } from "react-native";
import type { Task, UpdateTaskRequest } from "@a2n/shared";
import { Field, Input, Sheet } from "@/components/item/Sheet";
import { Button, Small } from "@/components/ui";
import { palette } from "@/theme";
import { DueField, KindPicker } from "./TaskFields";

type Props = {
  task: Task;
  /** Where the task came from, shown above the title. */
  source?: string;
  onClose: () => void;
  /** Only the fields that changed; the caller saves them (optimistically) and shows any error. */
  onSave: (patch: UpdateTaskRequest) => void;
};

/** Edit one task's text, kind and due date. Mount it to open it. */
export function TaskEditSheet({ task, source, onClose, onSave }: Props) {
  const [text, setText] = useState(task.task);
  const [kind, setKind] = useState(task.kind);
  const [due, setDue] = useState(task.due);
  const [error, setError] = useState<string | null>(null);

  const patch: UpdateTaskRequest = {
    ...(text.trim() !== task.task && { task: text.trim() }),
    ...(kind !== task.kind && { kind }),
    ...(due !== task.due && { due }),
  };
  const dirty = Object.keys(patch).length > 0;

  const save = () => {
    if (!text.trim()) return setError("The task needs some text.");
    if (dirty) onSave(patch);
    onClose();
  };

  const close = () => {
    if (!dirty) return onClose();
    Alert.alert("Discard your changes?", undefined, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onClose },
    ]);
  };

  return (
    <Sheet
      visible
      onClose={close}
      title="Edit task"
      eyebrow={source ? `from ${source}` : undefined}
      footer={
        <>
          <Button variant="ghost" size="sm" onPress={close}>
            Cancel
          </Button>
          <Button variant="ink" size="sm" onPress={save}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Task">
        <Input value={text} onChangeText={setText} multiline maxLength={500} placeholder="What needs doing?" accessibilityLabel="Task" style={{ minHeight: 64 }} />
      </Field>
      <Field label="Kind">
        <KindPicker value={kind} onChange={setKind} />
      </Field>
      <Field label="Due">
        <DueField value={due} onChange={setDue} />
      </Field>
      {error ? <Small style={{ color: palette.red600 }}>{error}</Small> : null}
    </Sheet>
  );
}

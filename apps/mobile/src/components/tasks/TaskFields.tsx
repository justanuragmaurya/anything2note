import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { TaskKind } from "@a2n/shared";
import { Chip, Icon, Label, PressableScale } from "@/components/ui";
import { fmtDue } from "@/lib/format";
import { fontFamily, palette } from "@/theme";

export const TASK_KINDS: { value: TaskKind; label: string }[] = [
  { value: "homework", label: "Homework" },
  { value: "reading", label: "Reading" },
  { value: "exam", label: "Exam" },
  { value: "project", label: "Project" },
];

export function KindPicker({ value, onChange }: { value: TaskKind; onChange: (k: TaskKind) => void }) {
  return (
    <View style={styles.chips}>
      {TASK_KINDS.map((k) => (
        <Chip key={k.value} size="sm" label={k.label} active={value === k.value} onPress={() => onChange(k.value)} />
      ))}
    </View>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
/** Local date → yyyy-mm-dd (not via UTC, which can land on the day before). */
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parseDay(iso: string | null): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y!, m! - 1, d!);
  // "2026-02-31" rolls over to March; that isn't a real day.
  return isoDay(date) === iso ? date : null;
}
export const isIsoDay = (s: string) => parseDay(s) !== null;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Month grid (weeks start on Monday); tapping a day picks it. */
function Calendar({ value, onPick }: { value: string | null; onPick: (iso: string) => void }) {
  const today = isoDay(new Date());
  const [month, setMonth] = useState(() => {
    const d = parseDay(value) ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const lead = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <View style={styles.calendar}>
      <View style={styles.calHead}>
        <PressableScale onPress={() => shift(-1)} hitSlop={8} haptics="select" accessibilityLabel="Previous month" style={styles.calNav}>
          <Icon name="back" size={13} color={palette.ink} weight="semibold" />
        </PressableScale>
        <Label style={{ flex: 1, textAlign: "center" }}>{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</Label>
        <PressableScale onPress={() => shift(1)} hitSlop={8} haptics="select" accessibilityLabel="Next month" style={styles.calNav}>
          <Icon name="forward" size={13} color={palette.ink} weight="semibold" />
        </PressableScale>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <View key={`w${i}`} style={styles.cell}>
            <Text style={styles.weekday}>{w}</Text>
          </View>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <View key={`e${i}`} style={styles.cell} />;
          const iso = isoDay(new Date(month.getFullYear(), month.getMonth(), d));
          const selected = iso === value;
          return (
            <View key={iso} style={styles.cell}>
              <PressableScale
                onPress={() => onPick(iso)}
                haptics="select"
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={fmtDue(iso)}
                style={[styles.day, iso === today && styles.today, selected && styles.selected]}
              >
                <Text style={[styles.dayText, selected && { color: palette.cream }]}>{d}</Text>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Due date: "Not mentioned" (null, the honest default when a lecturer gave none), quick picks,
 * or any day from the calendar.
 */
export function DueField({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const today = isoDay(new Date());
  const tomorrow = isoDay(addDays(new Date(), 1));
  const nextWeek = isoDay(addDays(new Date(), 7));
  const custom = value !== null && value !== today && value !== tomorrow && value !== nextWeek;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.chips}>
        <Chip size="sm" italic label="Not mentioned" active={value === null} onPress={() => onChange(null)} />
        <Chip size="sm" label="Today" active={value === today} onPress={() => onChange(today)} />
        <Chip size="sm" label="Tomorrow" active={value === tomorrow} onPress={() => onChange(tomorrow)} />
        <Chip size="sm" label="In a week" active={value === nextWeek} onPress={() => onChange(nextWeek)} />
        <Chip size="sm" icon="calendar" label={custom && value ? fmtDue(value) : "Pick a day"} active={custom || open} onPress={() => setOpen((o) => !o)} />
      </View>
      {open ? (
        <Calendar
          value={value}
          onPick={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  calendar: { borderRadius: 18, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.card, padding: 12 },
  calHead: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  calNav: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: palette.panel },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, height: 38, alignItems: "center", justifyContent: "center" },
  weekday: { fontFamily: fontFamily.mono, fontSize: 10, color: palette.muted },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  today: { borderWidth: 1, borderColor: palette.red300 },
  selected: { backgroundColor: palette.red500, borderColor: palette.red500 },
  dayText: { fontFamily: fontFamily.sans, fontSize: 14, color: palette.ink },
});

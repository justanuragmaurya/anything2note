import { useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import type { Anchor, TrackedTask } from "@a2n/shared";
import { TaskEditSheet } from "@/components/tasks/TaskEditSheet";
import { TaskRow } from "@/components/tasks/TaskRow";
import { ArtPlaceholder, Body, Button, Display, Eyebrow, Rise, Screen, SerifAccent, Skeleton, SlidingTabs, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { haptic } from "@/lib/haptics";
import { useEditTask, useTasks, useToggleTask } from "@/lib/queries";
import { palette } from "@/theme";

type Tab = "open" | "done";

const openAt = (itemId: string, a: Anchor) =>
  router.push({ pathname: "/item/[id]", params: a.kind === "time" ? { id: itemId, t: String(a.at) } : { id: itemId, p: String(a.page) } });

export default function Tasks() {
  const tasks = useTasks();
  const toggleTask = useToggleTask();
  const editTask = useEditTask();
  const [editing, setEditing] = useState<TrackedTask | null>(null);
  const all = tasks.data?.tasks ?? [];
  const [tab, setTab] = useState<Tab>("open");
  const [refreshing, setRefreshing] = useState(false);
  // Keep a just-ticked row visible briefly so the tick + strike animation can play.
  const [lingering, setLingering] = useState<string[]>([]);

  const toggle = (id: string, done: boolean, itemId: string) => {
    toggleTask.mutate({ id, done, itemId });
    setLingering((l) => [...l, id]);
    setTimeout(() => setLingering((l) => l.filter((x) => x !== id)), 700);
  };

  const refresh = async () => {
    setRefreshing(true);
    haptic.tap();
    await tasks.refetch();
    setRefreshing(false);
  };

  const visible = all.filter((a) => (tab === "open" ? !a.done : a.done) || lingering.includes(a.id));
  const openCount = all.filter((a) => !a.done).length;
  const sources = new Set(all.map((a) => a.itemId)).size;

  return (
    <Screen>
      {/* Title and Open/Done tabs stay put; only the list scrolls. */}
      <View style={styles.header}>
        <Rise>
          <Eyebrow>
            {tasks.isPending ? "Loading…" : all.length ? `${openCount} open · across ${sources} ${sources === 1 ? "item" : "items"}` : "No tasks yet"}
          </Eyebrow>
          <Display size={40} style={{ marginTop: 6 }}>
            Your <SerifAccent size={46}>tasks</SerifAccent>
          </Display>
        </Rise>
        <Rise delay={60} style={{ marginTop: 16 }}>
          <SlidingTabs
            tone="ink"
            value={tab}
            onChange={setTab}
            items={[
              { value: "open", label: "Open", badge: openCount || undefined },
              { value: "done", label: "Done", badge: all.length - openCount || undefined },
            ]}
          />
        </Rise>
        {toggleTask.isError ? <Small style={{ color: palette.red600, marginTop: 10 }}>Couldn&apos;t save that tick: {errorMessage(toggleTask.error)}</Small> : null}
        {editTask.isError ? <Small style={{ color: palette.red600, marginTop: 10 }}>Couldn&apos;t save that change: {errorMessage(editTask.error)}</Small> : null}
      </View>
      <Animated.FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        itemLayoutAnimation={LinearTransition.springify().damping(18)}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 32, gap: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.red500} colors={[palette.red500]} />}
        renderItem={({ item, index }) => (
          <Animated.View exiting={FadeOut.duration(200)} style={{ paddingHorizontal: 20 }}>
            <Rise index={Math.min(index, 6)} delay={100}>
              <TaskRow
                item={item}
                onToggle={() => toggle(item.id, !item.done, item.itemId)}
                source={item.itemTitle}
                onAnchor={(a) => openAt(item.itemId, a)}
                onEdit={() => setEditing(item)}
              />
            </Rise>
          </Animated.View>
        )}
        ListEmptyComponent={
          tasks.isPending ? (
            <View style={{ gap: 10, paddingHorizontal: 20 }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={84} radius={20} />
              ))}
            </View>
          ) : tasks.isError && !tasks.data ? (
            <Rise style={{ alignItems: "center", paddingHorizontal: 32, paddingTop: 32 }}>
              <Display size={26} style={{ textAlign: "center" }}>
                Couldn&apos;t load your <SerifAccent size={30}>tasks</SerifAccent>.
              </Display>
              <Body style={{ textAlign: "center", marginTop: 8 }}>{errorMessage(tasks.error)}</Body>
              <Button style={{ marginTop: 18 }} variant="ink" leadingIcon="refresh" loading={tasks.isFetching} onPress={() => void tasks.refetch()}>
                Try again
              </Button>
            </Rise>
          ) : (
            <Rise style={{ alignItems: "center", paddingHorizontal: 32, paddingTop: 24 }}>
              <ArtPlaceholder id="empty-actions" width={250} />
              <Display size={28} style={{ marginTop: 20, textAlign: "center" }}>
                {!all.length ? (
                  <>
                    No tasks <SerifAccent size={32}>yet</SerifAccent>.
                  </>
                ) : tab === "open" ? (
                  <>
                    Nothing <SerifAccent size={32}>left</SerifAccent>.
                  </>
                ) : (
                  <>
                    Nothing ticked <SerifAccent size={32}>yet</SerifAccent>.
                  </>
                )}
              </Display>
              <Body style={{ textAlign: "center", marginTop: 6 }}>
                {!all.length
                  ? "Homework, readings and exam dates mentioned in your lectures will show up here."
                  : tab === "open"
                    ? "Every task from your lectures is done."
                    : "Tick a task and it lands here."}
              </Body>
            </Rise>
          )
        }
      />
      {editing ? (
        <TaskEditSheet
          task={editing}
          source={editing.itemTitle}
          onClose={() => setEditing(null)}
          onSave={(patch) => editTask.mutate({ id: editing.id, patch, itemId: editing.itemId })}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.line,
  },
});

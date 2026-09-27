import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import { ActionRow } from "@/components/actions/ActionRow";
import { ArtPlaceholder, Body, Display, Eyebrow, Rise, Screen, SerifAccent, SlidingTabs } from "@/components/ui";
import { actionsStore, useActions } from "@/lib/actions-store";
import { itemById } from "@/lib/mock/items";
import { palette } from "@/theme";

type Tab = "open" | "done";

export default function Actions() {
  const all = useActions();
  const [tab, setTab] = useState<Tab>("open");
  // Keep a just-ticked row visible briefly so the tick + strike animation can play.
  const [lingering, setLingering] = useState<string[]>([]);

  const toggle = (id: string) => {
    actionsStore.toggle(id);
    setLingering((l) => [...l, id]);
    setTimeout(() => setLingering((l) => l.filter((x) => x !== id)), 700);
  };

  const visible = all.filter((a) => (tab === "open" ? !a.done : a.done) || lingering.includes(a.id));
  const openCount = all.filter((a) => !a.done).length;
  const meetings = new Set(all.map((a) => a.itemId)).size;

  return (
    <Screen>
      {/* Title and Open/Done tabs stay put; only the list scrolls. */}
      <View style={styles.header}>
        <Rise>
          <Eyebrow>
            {openCount} open · across {meetings} meetings
          </Eyebrow>
          <Display size={40} style={{ marginTop: 6 }}>
            Action <SerifAccent size={46}>items</SerifAccent>
          </Display>
        </Rise>
        <Rise delay={60} style={{ marginTop: 16 }}>
          <SlidingTabs
            tone="ink"
            value={tab}
            onChange={setTab}
            items={[
              { value: "open", label: "Open", badge: openCount },
              { value: "done", label: "Done", badge: all.length - openCount },
            ]}
          />
        </Rise>
      </View>
      <Animated.FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        itemLayoutAnimation={LinearTransition.springify().damping(18)}
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 32, gap: 10 }}
        renderItem={({ item, index }) => (
          <Animated.View exiting={FadeOut.duration(200)} style={{ paddingHorizontal: 20 }}>
            <Rise index={Math.min(index, 6)} delay={100}>
              <ActionRow item={item} onToggle={() => toggle(item.id)} source={itemById(item.itemId)?.title} />
            </Rise>
          </Animated.View>
        )}
        ListEmptyComponent={
          <Rise style={{ alignItems: "center", paddingHorizontal: 32, paddingTop: 24 }}>
            <ArtPlaceholder id="empty-actions" width={250} />
            <Display size={28} style={{ marginTop: 20, textAlign: "center" }}>
              {tab === "open" ? (
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
              {tab === "open" ? "Every action item from your meetings is done." : "Tick an item and it lands here."}
            </Body>
          </Rise>
        }
      />
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

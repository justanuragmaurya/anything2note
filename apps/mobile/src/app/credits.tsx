import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { CreditEntry } from "@a2n/shared";
import { TopBar } from "@/components/navigation/TopBar";
import { Body, Button, Display, Eyebrow, Label, Mono, PressableScale, Screen, SerifAccent, Skeleton, Small } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { creditLabel } from "@/lib/billing";
import { fmtDay } from "@/lib/format";
import { useCreditHistory, useMe } from "@/lib/queries";
import { palette } from "@/theme";

const time = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Row({ e }: { e: CreditEntry }) {
  const gained = e.delta > 0;
  const body = (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <Label numberOfLines={2}>{creditLabel(e)}</Label>
        <Small>
          {fmtDay(e.at)} · {time(e.at)}
        </Small>
      </View>
      <Mono style={{ fontSize: 14, color: gained ? palette.success : palette.ink }}>
        {gained ? "+" : "−"}
        {Math.abs(e.delta).toLocaleString()}
      </Mono>
    </View>
  );
  const itemId = e.itemId;
  if (!itemId) return body;
  return (
    <PressableScale scaleTo={0.98} onPress={() => router.push({ pathname: "/item/[id]", params: { id: itemId } })} accessibilityRole="button">
      {body}
    </PressableScale>
  );
}

/** Every credit added and spent, newest first, 50 at a time. */
export default function Credits() {
  const history = useCreditHistory();
  const balance = useMe().data?.billing.credits.balance;
  const [refreshing, setRefreshing] = useState(false);
  const entries = useMemo(() => history.data?.pages.flatMap((p) => p.entries) ?? [], [history.data]);

  const refresh = async () => {
    setRefreshing(true);
    await history.refetch();
    setRefreshing(false);
  };

  return (
    <Screen>
      <TopBar title="Credit history" />
      <View style={styles.header}>
        <Eyebrow>{balance === undefined ? "Credits" : `${balance.toLocaleString()} credits to spend`}</Eyebrow>
        <Display size={38} style={{ marginTop: 6 }}>
          Where they <SerifAccent size={44}>went</SerifAccent>
        </Display>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <Row e={item} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) void history.fetchNextPage();
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={palette.red500} colors={[palette.red500]} />}
        ListEmptyComponent={
          history.isPending ? (
            <View style={{ gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={52} radius={14} />
              ))}
            </View>
          ) : history.isError ? (
            <View style={{ alignItems: "center", paddingTop: 30 }}>
              <Body style={{ textAlign: "center" }}>{errorMessage(history.error)}</Body>
              <Button style={{ marginTop: 16 }} variant="ink" leadingIcon="refresh" loading={history.isFetching} onPress={() => void history.refetch()}>
                Try again
              </Button>
            </View>
          ) : (
            <Body style={{ paddingTop: 20 }}>No credits added or spent yet.</Body>
          )
        }
        ListFooterComponent={history.isFetchingNextPage ? <ActivityIndicator color={palette.red500} style={{ marginTop: 16 }} /> : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line },
});

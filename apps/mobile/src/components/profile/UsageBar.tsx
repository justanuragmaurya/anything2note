import { View } from "react-native";
import { Mono, ProgressBar, Small } from "@/components/ui";
import { palette } from "@/theme";

export function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const ratio = used / limit;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Small style={{ color: palette.inkSoft }}>{label}</Small>
        <Mono style={{ fontSize: 11, color: ratio > 0.8 ? palette.red600 : palette.muted }}>
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </Mono>
      </View>
      <ProgressBar value={ratio} color={ratio > 0.8 ? palette.red500 : palette.ink} />
    </View>
  );
}

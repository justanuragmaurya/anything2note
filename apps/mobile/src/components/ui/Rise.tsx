import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, FadeInDown, LinearTransition } from "react-native-reanimated";

type Props = { children: ReactNode; delay?: number; index?: number; style?: StyleProp<ViewStyle>; className?: string };

/**
 * Blur-rise entering animation (`.rise` on web). Native has no cheap per-view blur,
 * so it approximates the feel with a soft 14pt rise + fade on an ease-out curve.
 * `index` staggers siblings by 60ms.
 */
export function Rise({ children, delay = 0, index = 0, style, className }: Props) {
  return (
    <Animated.View
      entering={FadeInDown.duration(520)
        .delay(delay + index * 60)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
        .easing(Easing.bezier(0.25, 0.46, 0.45, 0.94).factory())}
      layout={LinearTransition.springify().damping(18)}
      style={style}
    >
      {/* NativeWind classes go on a plain View; Reanimated components don't map className. */}
      {className ? <View className={className}>{children}</View> : children}
    </Animated.View>
  );
}

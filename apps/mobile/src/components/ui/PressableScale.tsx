import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import { cssInterop } from "nativewind";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { motion } from "@/theme";

const APressable = Animated.createAnimatedComponent(Pressable);
// Let NativeWind `className` flow into the animated pressable's style.
cssInterop(APressable, { className: "style" });

type Props = Omit<PressableProps, "style" | "children"> & {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Scale while pressed (design system: 0.97). */
  scaleTo?: number;
  haptics?: "tap" | "press" | "select" | false;
};

/** Pressable that springs down to `scaleTo` and nudges 1pt, with a haptic tick. */
export function PressableScale({ children, style, scaleTo = 0.97, haptics = "tap", onPressIn, onPressOut, onPress, disabled, ...rest }: Props) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - scaleTo) * pressed.value }, { translateY: pressed.value }],
  }));
  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.set(withTiming(1, { duration: motion.fast / 2 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withSpring(0, { damping: 14, stiffness: 260 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics) haptic[haptics]();
        onPress?.(e);
      }}
      style={[style, animated, disabled ? { opacity: 0.5 } : null]}
    >
      {children}
    </APressable>
  );
}

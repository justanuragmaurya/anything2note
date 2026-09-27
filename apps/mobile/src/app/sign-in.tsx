import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { Body, Button, Caret, Display, Eyebrow, Icon, PressableScale, Rise, SerifAccent, Small } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { useSession } from "@/lib/session";
import { fontFamily, palette } from "@/theme";

const CODE_LENGTH = 6;

function OtpBoxes({ code, focused }: { code: string; focused: boolean }) {
  return (
    <View style={styles.otpRow}>
      {Array.from({ length: CODE_LENGTH }).map((_, i) => {
        const ch = code[i];
        const active = focused && i === Math.min(code.length, CODE_LENGTH - 1);
        return (
          <View key={i} style={[styles.otpBox, active && styles.otpBoxActive, ch ? styles.otpBoxFilled : null]}>
            {ch ? (
              <Animated.Text entering={FadeInDown.duration(180)} style={styles.otpChar}>
                {ch}
              </Animated.Text>
            ) : active ? (
              <Caret height={24} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(30);
  const codeRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  useEffect(() => {
    if (step !== "code" || resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [step, resendIn]);

  const finish = (e: string) => {
    haptic.success();
    signIn(e);
    router.replace("/library");
  };

  const sendCode = () => {
    if (!validEmail) {
      haptic.warn();
      shake.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-4, { duration: 50 }), withTiming(0, { duration: 50 })));
      return;
    }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("code");
      setResendIn(30);
      setTimeout(() => codeRef.current?.focus(), 250);
    }, 700);
  };

  const onCode = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) {
      setBusy(true);
      setTimeout(() => finish(email.trim()), 600);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
      >
        <Rise>
          <Eyebrow color={palette.red600}>{step === "email" ? "Sign in" : "Check your inbox"}</Eyebrow>
        </Rise>
        <Rise delay={60}>
          <Display size={42} style={{ marginTop: 12 }}>
            {step === "email" ? (
              <>
                Your notes, <SerifAccent size={48}>everywhere</SerifAccent>.
              </>
            ) : (
              <>
                Enter the <SerifAccent size={48}>six digits</SerifAccent>.
              </>
            )}
          </Display>
        </Rise>
        <Rise delay={120}>
          <Body style={{ marginTop: 12 }}>
            {step === "email" ? "No passwords. We'll email you a one-time code." : `We sent a code to ${email.trim()}. Any 6 digits work in this preview.`}
          </Body>
        </Rise>

        {step === "email" ? (
          <Animated.View key="email" entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={{ marginTop: 32, gap: 12 }}>
            <Animated.View style={[styles.input, focused && styles.inputFocused, shakeStyle]}>
              <Icon name="mail" size={18} color={palette.muted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={palette.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={sendCode}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={styles.inputText}
              />
            </Animated.View>
            <Button block size="lg" onPress={sendCode} loading={busy} icon="arrowRight">
              Continue with email
            </Button>

            <View style={styles.divider}>
              <View style={styles.rule} />
              <Eyebrow>or</Eyebrow>
              <View style={styles.rule} />
            </View>

            <Button block size="lg" variant="ink" leadingIcon="apple" onPress={() => finish("you@icloud.com")}>
              Continue with Apple
            </Button>
            <Button block size="lg" variant="ghost" leadingIcon="google" onPress={() => finish("you@gmail.com")}>
              Continue with Google
            </Button>
          </Animated.View>
        ) : (
          <Animated.View key="code" entering={FadeInDown.duration(320)} style={{ marginTop: 32, gap: 18 }}>
            <PressableScale haptics={false} scaleTo={1} onPress={() => codeRef.current?.focus()}>
              <OtpBoxes code={code} focused={focused} />
            </PressableScale>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={onCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={styles.hiddenInput}
              caretHidden
            />
            <Button block size="lg" onPress={() => onCode(code)} loading={busy} disabled={code.length < CODE_LENGTH}>
              Verify and continue
            </Button>
            <View style={styles.codeFooter}>
              <PressableScale
                onPress={() => {
                  setStep("email");
                  setCode("");
                }}
              >
                <Small color={palette.inkSoft}>Change email</Small>
              </PressableScale>
              <PressableScale disabled={resendIn > 0} onPress={() => setResendIn(30)}>
                <Text style={styles.resend}>{resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, "0")}` : "Resend code"}</Text>
              </PressableScale>
            </View>
          </Animated.View>
        )}

        <View style={{ flex: 1 }} />
        <Small style={{ textAlign: "center", marginTop: 32 }}>By continuing you agree to the Terms and Privacy Policy.</Small>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: palette.card,
    paddingHorizontal: 18,
  },
  inputFocused: { borderColor: palette.ink },
  inputText: { flex: 1, fontFamily: fontFamily.sans, fontSize: 16, color: palette.ink, height: "100%" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 6 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.lineStrong },
  otpRow: { flexDirection: "row", gap: 8, justifyContent: "space-between" },
  otpBox: {
    flex: 1,
    aspectRatio: 0.82,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.lineStrong,
    backgroundColor: palette.card,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxActive: { borderColor: palette.red500, borderWidth: 1.5 },
  otpBoxFilled: { backgroundColor: palette.paperGlow, borderColor: palette.ink },
  otpChar: { fontFamily: fontFamily.mono, fontSize: 24, color: palette.ink },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
  codeFooter: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  resend: { fontFamily: fontFamily.mono, fontSize: 12, color: palette.red600 },
});

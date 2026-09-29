import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { Body, Button, Caret, Display, Eyebrow, Icon, PressableScale, Rise, SerifAccent, Small } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { haptic } from "@/lib/haptics";
import { fontFamily, palette } from "@/theme";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;
const UNREACHABLE = "Can't reach anything2note right now. Check your connection and try again.";

type Failure = { data: null; error: { code?: string; message?: string } };

/** Better Auth resolves API errors as `{ error }` but throws when the request never reaches the server. */
async function request<T>(fn: () => Promise<T>): Promise<T | Failure> {
  try {
    return await fn();
  } catch {
    return { data: null, error: { message: UNREACHABLE } };
  }
}

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

/**
 * Better Auth sign-in: email → 6-digit code. New emails get an account on first sign-in.
 * Google comes back once the API has a real https domain (Google won't redirect a phone to a LAN address).
 * On success nothing navigates from here: the session guard in _layout swaps to Library.
 */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const codeRef = useRef<TextInput>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());

  useEffect(() => {
    if (step !== "code" || resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [step, resendIn]);

  const nudge = () => {
    haptic.warn();
    shake.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-4, { duration: 50 }), withTiming(0, { duration: 50 })));
  };

  const sendCode = async () => {
    if (!validEmail) {
      setEmailError("Enter a valid email address.");
      nudge();
      return;
    }
    setEmailError(null);
    setSending(true);
    const { error } = await request(() => authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" }));
    setSending(false);
    if (error) {
      setEmailError(error.message ?? "We couldn't send a code. Try again in a moment.");
      nudge();
      return;
    }
    setStep("code");
    setCode("");
    setCodeError(null);
    setResendIn(RESEND_SECONDS);
    setTimeout(() => codeRef.current?.focus(), 250);
  };

  const verify = async (otp: string) => {
    if (verifying) return;
    setVerifying(true);
    setCodeError(null);
    const { error } = await request(() => authClient.signIn.emailOtp({ email: email.trim(), otp }));
    if (error) {
      setVerifying(false);
      setCode("");
      setCodeError(
        error.code === "TOO_MANY_ATTEMPTS"
          ? "Too many tries. Send a new code."
          : error.code === "OTP_EXPIRED"
            ? "That code has expired. Send a new one."
            : error.code === "INVALID_OTP"
              ? "That code didn't work. Check the latest email, or send a new code."
              : (error.message ?? "We couldn't check that code. Try again in a moment."),
      );
      nudge();
      return;
    }
    // Stay busy until the new session lands and _layout routes to Library.
    haptic.success();
  };

  const onCode = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (codeError) setCodeError(null);
    if (digits.length === CODE_LENGTH) void verify(digits);
  };

  const resend = async () => {
    setResendIn(RESEND_SECONDS);
    setCode("");
    setCodeError(null);
    const { error } = await request(() => authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" }));
    if (error) setCodeError(error.message ?? "We couldn't send a new code. Try again in a moment.");
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
            {step === "email"
              ? "No passwords. We'll email you a one-time code. New here? The same code creates your account."
              : `We sent a code to ${email.trim()}. It expires in 10 minutes.`}
          </Body>
        </Rise>

        {step === "email" ? (
          <Animated.View key="email" entering={FadeIn.duration(260)} exiting={FadeOut.duration(160)} style={{ marginTop: 32, gap: 12 }}>
            <Animated.View style={[styles.input, focused && styles.inputFocused, shakeStyle]}>
              <Icon name="mail" size={18} color={palette.muted} />
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (emailError) setEmailError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={palette.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={() => void sendCode()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={styles.inputText}
              />
            </Animated.View>
            {emailError ? (
              <Animated.View entering={FadeIn.duration(180)}>
                <Small color={palette.red600} style={{ paddingHorizontal: 18 }}>
                  {emailError}
                </Small>
              </Animated.View>
            ) : null}
            <Button block size="lg" onPress={() => void sendCode()} loading={sending} icon="arrowRight">
              Continue with email
            </Button>
          </Animated.View>
        ) : (
          <Animated.View key="code" entering={FadeInDown.duration(320)} style={{ marginTop: 32, gap: 18 }}>
            <PressableScale haptics={false} scaleTo={1} onPress={() => codeRef.current?.focus()}>
              <Animated.View style={shakeStyle}>
                <OtpBoxes code={code} focused={focused} />
              </Animated.View>
            </PressableScale>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={onCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              editable={!verifying}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              style={styles.hiddenInput}
              caretHidden
            />
            {codeError ? (
              <Animated.View entering={FadeIn.duration(180)}>
                <Small color={palette.red600} style={{ paddingHorizontal: 4 }}>
                  {codeError}
                </Small>
              </Animated.View>
            ) : null}
            <Button block size="lg" onPress={() => void verify(code)} loading={verifying} disabled={code.length < CODE_LENGTH}>
              Verify and continue
            </Button>
            <View style={styles.codeFooter}>
              <PressableScale
                disabled={verifying}
                onPress={() => {
                  setStep("email");
                  setCode("");
                  setCodeError(null);
                }}
              >
                <Small color={palette.inkSoft}>Change email</Small>
              </PressableScale>
              <PressableScale disabled={resendIn > 0 || verifying} onPress={() => void resend()}>
                <Text style={styles.resend}>{resendIn > 0 ? `Resend in 0:${String(resendIn).padStart(2, "0")}` : "Resend code"}</Text>
              </PressableScale>
            </View>
            {__DEV__ ? (
              <View style={styles.devHint}>
                <Icon name="info" size={14} color={palette.red500} />
                <Small style={{ flex: 1 }}>In local dev the code also prints in the API logs.</Small>
              </View>
            ) : null}
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
  devHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.lineStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});

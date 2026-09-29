"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Loader2, Mail, Terminal } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { GoogleLogo } from "./brand-icons";
import { OtpInput } from "./otp-input";

type Step = "email" | "code";
const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Better Auth sign-in: email → 6-digit code, or Google. New emails get an account on first sign-in. */
export function SignInForm({ next, oauthError }: { next: string; oauthError?: string }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(oauthError ? "Google sign-in didn't finish. Try again, or use your email." : null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [redirecting, setRedirecting] = useState(false);
  const [otpKey, setOtpKey] = useState(0);
  const emailId = useId();
  const errId = useId();
  const codeErrId = useId();

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  useEffect(() => {
    if (step !== "code" || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setEmailError("Enter a valid email address, like you@example.com.");
      return;
    }
    setEmailError(null);
    setSending(true);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: value, type: "sign-in" });
    setSending(false);
    if (error) {
      setEmailError(error.message ?? "We couldn't send a code. Try again in a moment.");
      return;
    }
    setStep("code");
    setResendIn(RESEND_SECONDS);
    setCodeError(null);
  };

  const verify = async (code: string) => {
    setVerifying(true);
    setCodeError(null);
    const { error } = await authClient.signIn.emailOtp({ email: email.trim(), otp: code });
    if (error) {
      setVerifying(false);
      setCodeError(
        error.code === "TOO_MANY_ATTEMPTS" ? "Too many tries. Send a new code." : "That code didn't work. Check the latest email, or send a new code.",
      );
      setErrorKey((k) => k + 1);
      return;
    }
    router.replace(next);
  };

  const resend = async () => {
    setResendIn(RESEND_SECONDS);
    setCodeError(null);
    setOtpKey((k) => k + 1);
    const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    if (error) setCodeError(error.message ?? "We couldn't send a new code. Try again in a moment.");
  };

  const google = async () => {
    setRedirecting(true);
    const origin = window.location.origin;
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${origin}${next}`,
      errorCallbackURL: `${origin}/sign-in?error=google&next=${encodeURIComponent(next)}`,
    });
    if (error) {
      setRedirecting(false);
      setEmailError(error.message ?? "Google sign-in isn't available right now. Use your email instead.");
    }
  };

  return (
    <div className="w-full max-w-[400px]">
      {step === "email" && (
        <div key="email" className="rise">
          <p className="eyebrow">Sign in or create an account</p>
          <h1 className="mt-4 text-[40px] leading-[1.05] font-normal tracking-[-0.04em]">
            Welcome to your <span className="serif-accent text-red-500">notes.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            New here? The same form creates your account. Every plan starts with a 7-day free trial.
          </p>

          <form onSubmit={sendCode} noValidate className="mt-8">
            <label htmlFor={emailId} className="text-sm font-medium text-ink">
              Email
            </label>
            <div
              className={`mt-2 flex items-center gap-3 rounded-full border bg-card px-4 transition-all duration-200 focus-within:border-red-400 focus-within:shadow-[0_0_0_4px_var(--red-50)] ${
                emailError ? "border-red-400" : "border-line-strong"
              }`}
            >
              <Mail className="size-4 shrink-0 text-muted" aria-hidden />
              <input
                id={emailId}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                aria-invalid={!!emailError || undefined}
                aria-describedby={emailError ? errId : undefined}
                className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted/70"
              />
            </div>
            {emailError && (
              <p id={errId} role="alert" className="rise mt-2 pl-4 text-[13px] text-red-600">
                {emailError}
              </p>
            )}
            <button type="submit" disabled={sending} className="btn btn-red btn-lg mt-4 w-full">
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Sending code…
                </>
              ) : (
                <>
                  Continue with email
                  <ArrowUpRight className="btn-arrow size-4" />
                </>
              )}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-xs text-muted" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="flex flex-col gap-2.5">
            <button type="button" onClick={google} disabled={redirecting} className="btn btn-ghost w-full bg-card/40">
              {redirecting ? <Loader2 className="size-[18px] animate-spin" /> : <GoogleLogo className="size-[18px]" />}
              Continue with Google
            </button>
          </div>
        </div>
      )}

      {step === "code" && (
        <div key="code" className="rise">
          <button
            type="button"
            onClick={() => setStep("email")}
            className="group inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Use a different email
          </button>
          <h1 className="mt-6 text-[40px] leading-[1.05] font-normal tracking-[-0.04em]">
            Check your <span className="serif-accent text-red-500">inbox.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            We sent a 6-digit code to <span className="font-medium break-all text-ink">{email.trim()}</span>. It expires in 10
            minutes.
          </p>

          <div className="mt-8">
            <OtpInput
              key={otpKey}
              onComplete={verify}
              disabled={verifying}
              errorKey={errorKey}
              invalid={!!codeError}
              describedBy={codeError ? codeErrId : undefined}
            />
          </div>

          <div className="mt-3 min-h-[40px]" aria-live="polite">
            {verifying && (
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <Loader2 className="size-3.5 animate-spin" /> Checking code…
              </p>
            )}
            {codeError && !verifying && (
              <p id={codeErrId} role="alert" className="text-[13px] text-red-600">
                {codeError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-line pt-5 text-sm">
            <span className="text-muted">Didn&apos;t get it? Check spam.</span>
            {resendIn > 0 ? (
              <span className="font-mono text-xs text-muted tabular-nums" aria-live="off">
                Resend in 0:{String(resendIn).padStart(2, "0")}
              </span>
            ) : (
              <button type="button" onClick={resend} className="link-underline text-ink">
                Resend code
              </button>
            )}
          </div>

          {process.env.NODE_ENV === "development" && (
            <p className="mt-6 flex items-start gap-2.5 rounded-xl border border-dashed border-line-strong bg-card/60 px-3.5 py-3 text-[12px] leading-relaxed text-ink-soft">
              <Terminal className="mt-0.5 size-3.5 shrink-0 text-red-500" aria-hidden />
              <span>In local dev the code also prints in the API logs.</span>
            </p>
          )}
        </div>
      )}

      <p className="mt-8 text-[12px] leading-relaxed text-muted">
        By continuing you agree to our{" "}
        <Link href="/terms" className="link-underline text-ink-soft">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="link-underline text-ink-soft">
          Privacy policy
        </Link>
        .
      </p>
    </div>
  );
}

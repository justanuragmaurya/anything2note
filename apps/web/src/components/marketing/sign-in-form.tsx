"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, Loader2, Mail, Terminal } from "lucide-react";
import { AppleLogo, GoogleLogo } from "./brand-icons";
import { OtpInput } from "./otp-input";

type Step = "email" | "code" | "done";
const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Mock sign-in: email → 6-digit code → done. Any code except 000000 succeeds.
 * Real auth (Better Auth email OTP + Google + Apple) replaces the timeouts.
 */
export function SignInForm({ next }: { next: string }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [provider, setProvider] = useState<string | null>(null);
  const [otpKey, setOtpKey] = useState(0);
  const emailId = useId();
  const errId = useId();
  const codeErrId = useId();

  useEffect(() => {
    if (step !== "code" || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setEmailError("Enter a valid email address, like you@example.com.");
      return;
    }
    setEmailError(null);
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setStep("code");
      setResendIn(RESEND_SECONDS);
      setCodeError(null);
    }, 700);
  };

  const verify = (code: string) => {
    setVerifying(true);
    setCodeError(null);
    setTimeout(() => {
      setVerifying(false);
      if (code === "000000") {
        setCodeError("That code didn't work. Check the latest email, or send a new code.");
        setErrorKey((k) => k + 1);
      } else {
        setProvider(null);
        setStep("done");
      }
    }, 650);
  };

  const resend = () => {
    setResendIn(RESEND_SECONDS);
    setCodeError(null);
    setOtpKey((k) => k + 1);
  };

  const oauth = (name: string) => {
    setProvider(name);
    setStep("done");
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
            New here? The same form creates your account. Free plan, no card needed.
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
            <button type="button" onClick={() => oauth("Google")} className="btn btn-ghost w-full bg-card/40">
              <GoogleLogo className="size-[18px]" />
              Continue with Google
            </button>
            <button type="button" onClick={() => oauth("Apple")} className="btn btn-ghost w-full bg-card/40">
              <AppleLogo className="size-[18px]" />
              Continue with Apple
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

          <p className="mt-6 flex items-start gap-2.5 rounded-xl border border-dashed border-line-strong bg-card/60 px-3.5 py-3 text-[12px] leading-relaxed text-ink-soft">
            <Terminal className="mt-0.5 size-3.5 shrink-0 text-red-500" aria-hidden />
            <span>
              In local dev the code prints in the API logs.{" "}
              <span className="text-muted">(This preview accepts any 6 digits except 000000.)</span>
            </span>
          </p>
        </div>
      )}

      {step === "done" && (
        <div key="done" className="rise">
          <span className="grid size-14 place-items-center rounded-2xl bg-[image:var(--button-red)] text-cream shadow-[var(--button-shadow)]">
            <Check className="size-7" strokeWidth={2.5} />
          </span>
          <h1 className="mt-8 text-[40px] leading-[1.05] font-normal tracking-[-0.04em]">
            You&apos;re <span className="serif-accent text-red-500">in.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            {provider ? `Signed in with ${provider}.` : `Signed in as ${email.trim()}.`} Your library is ready.
          </p>
          <Link href={next} className="btn btn-red btn-lg mt-8 w-full">
            Continue
            <ArrowUpRight className="btn-arrow size-4" />
          </Link>
          <p className="mt-3 text-center font-mono text-[11px] tracking-[0.08em] text-muted">
            → <span className="break-all">{next}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setProvider(null);
            }}
            className="mx-auto mt-6 block text-sm text-muted transition-colors hover:text-ink"
          >
            Not you? Start over
          </button>
        </div>
      )}

      {step !== "done" && (
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
      )}
    </div>
  );
}

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { NoteTypeKey } from "./note-types";

/**
 * Mock session + preferences. In-memory only (resets on reload); replace with
 * Better Auth + a persisted store (expo-sqlite / secure-store) when the API exists.
 */
export type Plan = "free" | "pro";
export type AutoType = NoteTypeKey | "auto";

type Prefs = {
  defaultNoteType: AutoType;
  outputLanguage: string;
  autoDeleteOriginals: boolean;
  notifications: boolean;
};

type Session = {
  onboarded: boolean;
  email: string | null;
  plan: Plan;
  prefs: Prefs;
  finishOnboarding: () => void;
  signIn: (email: string) => void;
  signOut: () => void;
  upgrade: () => void;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [onboarded, setOnboarded] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [prefs, setPrefs] = useState<Prefs>({
    defaultNoteType: "auto",
    outputLanguage: "English",
    autoDeleteOriginals: false,
    notifications: true,
  });

  const value = useMemo<Session>(
    () => ({
      onboarded,
      email,
      plan,
      prefs,
      finishOnboarding: () => setOnboarded(true),
      signIn: (e) => {
        setOnboarded(true);
        setEmail(e);
      },
      signOut: () => {
        setEmail(null);
        setPlan("free");
      },
      upgrade: () => setPlan("pro"),
      setPref: (key, v) => setPrefs((p) => ({ ...p, [key]: v })),
    }),
    [onboarded, email, plan, prefs],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside <SessionProvider>");
  return s;
}

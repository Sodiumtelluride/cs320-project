"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authAdapter, type AuthAdapter, type AuthUser } from "@/lib/auth";

export type AuthMode = "login" | "signup";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  sessionError: string;
  mode: AuthMode | null;
  openAuth(mode: AuthMode): void;
  closeAuth(): void;
  isAuthModeActive(mode: AuthMode): boolean;
  restoreAuthFocus(): void;
  signIn: AuthAdapter["signIn"];
  signUp: AuthAdapter["signUp"];
  signOut: AuthAdapter["signOut"];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, adapter = authAdapter }: {
  children: ReactNode;
  adapter?: AuthAdapter;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [mode, setMode] = useState<AuthMode | null>(null);
  const activeMode = useRef<AuthMode | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    adapter.getUser().then(
      (currentUser) => { if (active) setUser(currentUser); },
      () => { if (active) setSessionError("We couldn’t check your account. You can keep browsing as a guest."); }
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [adapter]);

  return (
    <AuthContext.Provider value={{
      user, loading, sessionError, mode,
      openAuth(nextMode) {
        if (activeMode.current === null) {
          const origin = document.activeElement;
          returnFocus.current = origin instanceof HTMLElement ? origin : null;
        }
        activeMode.current = nextMode;
        setMode(nextMode);
      },
      closeAuth() {
        activeMode.current = null;
        setMode(null);
      },
      isAuthModeActive: (currentMode) => activeMode.current === currentMode,
      restoreAuthFocus() {
        const origin = returnFocus.current;
        returnFocus.current = null;
        if (origin?.isConnected) {
          origin.focus();
          if (document.activeElement === origin) return;
        }
        document.getElementById("main-content")?.focus();
      },
      async signIn(input) {
        if (loading) throw new Error("Please wait while we check your account.");
        const currentUser = await adapter.signIn(input);
        setUser(currentUser);
        setSessionError("");
        return currentUser;
      },
      async signUp(input) {
        if (loading) throw new Error("Please wait while we check your account.");
        const result = await adapter.signUp(input);
        if (result.status === "signed-in") setUser(result.user);
        setSessionError("");
        return result;
      },
      async signOut() {
        await adapter.signOut();
        setUser(null);
      },
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

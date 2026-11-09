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
  addAllergy(allergy: string): Promise<void>;
  removeAllergy(allergy: string): Promise<void>;
  addFavoriteFood(food: string): Promise<void>;
  removeFavoriteFood(food: string): Promise<void>;
};

type DetailList = "allergies" | "favoriteFoods";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, adapter = authAdapter }: {
  children: ReactNode;
  adapter?: AuthAdapter;
}) {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const user = users[0] ?? null;
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [mode, setMode] = useState<AuthMode | null>(null);
  const activeMode = useRef<AuthMode | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    adapter.getUser().then(
      (currentUser) => { if (active) setUsers(currentUser ? [currentUser] : []); },
      () => { if (active) setSessionError("We couldn’t check your account. You can keep browsing as a guest."); }
    ).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [adapter]);

  function patchList(field: DetailList, values: string[]) {
    setUsers((current) => {
      const base = current[0];
      return base ? [{ ...base, [field]: values }] : current;
    });
  }

  // The backend owns these lists, so re-read the account after every write and
  // let that answer win. If the re-read fails the write already landed, so keep
  // the optimistic state and let the next page load resync.
  async function resync() {
    try {
      const fresh = await adapter.getUser();
      setUsers(fresh ? [fresh] : []);
    } catch {
      /* keep what we have */
    }
  }

  // Adds send the whole list (PUT replaces it); removals use DELETE because the
  // update RPC ignores an empty list instead of clearing it.
  async function addEntry(field: DetailList, raw: string) {
    const entry = raw.trim();
    if (!entry) throw new Error(field === "allergies" ? "Enter an allergy to add." : "Enter a food to add.");
    const current = user;
    const userId = current?.id;
    if (!current || !userId) throw new Error("Please log in to change your account details.");
    const previous = current[field] ?? [];
    if (previous.some((entry2) => entry2.toLowerCase() === entry.toLowerCase())) {
      throw new Error(field === "allergies" ? "That allergy is already on your list." : "That food is already on your list.");
    }
    const next = [...previous, entry];
    patchList(field, next);
    try {
      if (field === "allergies") await adapter.saveAllergies(userId, next);
      else await adapter.saveFavoriteFoods(userId, next);
    } catch (cause) {
      patchList(field, previous);
      throw cause;
    }
    await resync();
  }

  async function removeEntry(field: DetailList, entry: string) {
    const current = user;
    const userId = current?.id;
    if (!current || !userId) throw new Error("Please log in to change your account details.");
    const previous = current[field] ?? [];
    if (!previous.includes(entry)) throw new Error("That entry is no longer on your list.");
    patchList(field, previous.filter((item) => item !== entry));
    try {
      if (field === "allergies") await adapter.removeAllergy(userId, entry);
      else await adapter.removeFavoriteFood(userId, entry);
    } catch (cause) {
      patchList(field, previous);
      throw cause;
    }
    await resync();
  }

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
        setUsers(currentUser ? [currentUser] : []);
        setSessionError("");
        return currentUser;
      },
      async signUp(input) {
        if (loading) throw new Error("Please wait while we check your account.");
        const result = await adapter.signUp(input);
        if (result.status === "signed-in") setUsers([result.user]);
        setSessionError("");
        return result;
      },
      async signOut() {
        await adapter.signOut();
        setUsers([]);
      },
      addAllergy: (allergy) => addEntry("allergies", allergy),
      removeAllergy: (allergy) => removeEntry("allergies", allergy),
      addFavoriteFood: (food) => addEntry("favoriteFoods", food),
      removeFavoriteFood: (food) => removeEntry("favoriteFoods", food),
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

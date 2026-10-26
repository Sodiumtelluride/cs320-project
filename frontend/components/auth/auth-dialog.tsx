"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { useAuth, type AuthMode } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

function AuthForm({ mode }: { mode: AuthMode }) {
  const auth = useAuth();
  const router = useRouter();
  const id = useId();
  const signup = mode === "signup";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function isActive() {
    return mounted.current && auth.isAuthModeActive(mode);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    setError("");
    setPasswordMismatch(false);

    if (signup && !name) {
      setError("Please enter your name.");
      form.querySelector<HTMLInputElement>('[name="name"]')?.focus();
      return;
    }
    if (signup && password !== data.get("confirmPassword")) {
      setError("Your passwords don’t match.");
      setPasswordMismatch(true);
      form.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus();
      return;
    }

    setPending(true);
    try {
      if (signup) {
        const result = await auth.signUp({ name, email, password });
        if (!isActive()) return;
        if (result.status === "confirmation-required") {
          form.reset();
          setConfirmationRequired(true);
          return;
        }
      } else {
        await auth.signIn({ email, password });
      }
      if (!isActive()) return;
      form.reset();
      auth.closeAuth();
      router.push("/profile");
    } catch (cause) {
      if (isActive()) {
        setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
      }
    } finally {
      if (isActive()) setPending(false);
    }
  }

  if (confirmationRequired) {
    return (
      <div className="space-y-5">
        <DialogTitle>Check your email</DialogTitle>
        <DialogDescription>Check your inbox to confirm your account, then come back to log in.</DialogDescription>
        <Button className="w-full" onClick={() => auth.openAuth("login")}>Back to log in</Button>
        <Button variant="ghost" className="w-full" onClick={auth.closeAuth}>Continue as guest</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <DialogTitle>{signup ? "Create your account" : "Welcome back"}</DialogTitle>
        <DialogDescription>{signup ? "Save your favorites for next time." : "Log in to find your saved favorites."} You can always browse without an account.</DialogDescription>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={pending || auth.loading} className="space-y-4">
          {signup && (
            <div className="space-y-2">
              <label htmlFor={`${id}-name`} className="text-sm font-medium">Name</label>
              <Input id={`${id}-name`} name="name" autoComplete="name" maxLength={80} placeholder="Your name" required />
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor={`${id}-email`} className="text-sm font-medium">Email</label>
            <Input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
          </div>
          <div className="space-y-2">
            <label htmlFor={`${id}-password`} className="text-sm font-medium">Password</label>
            <Input id={`${id}-password`} name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 8 : undefined} aria-describedby={signup ? `${id}-password-help` : undefined} required />
            {signup && <p id={`${id}-password-help`} className="text-xs text-muted-foreground">Use at least 8 characters.</p>}
          </div>
          {signup && (
            <div className="space-y-2">
              <label htmlFor={`${id}-confirm`} className="text-sm font-medium">Confirm password</label>
              <Input id={`${id}-confirm`} name="confirmPassword" type="password" autoComplete="new-password" aria-invalid={passwordMismatch} aria-describedby={passwordMismatch ? `${id}-error` : undefined} onChange={() => { if (passwordMismatch) { setPasswordMismatch(false); setError(""); } }} required />
            </div>
          )}
          {error && <p id={`${id}-error`} role="alert" className="rounded-md border border-primary/20 bg-accent p-3 text-sm text-primary">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending || auth.loading}>
            {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {pending ? (signup ? "Creating account…" : "Logging in…") : (signup ? "Create account" : "Log in")}
          </Button>
        </fieldset>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {signup ? "Already have an account? " : "New here? "}
        <button type="button" disabled={pending} onClick={() => auth.openAuth(signup ? "login" : "signup")} className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50">{signup ? "Log in" : "Sign up"}</button>
      </p>
      <Button variant="ghost" className="w-full" onClick={auth.closeAuth}>Continue as guest</Button>
    </div>
  );
}

export function AuthDialog() {
  const { mode, closeAuth, restoreAuthFocus } = useAuth();
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => { if (!open) closeAuth(); }}>
      <DialogContent
        className="max-h-[calc(100svh-2rem)] overflow-y-auto"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreAuthFocus();
        }}
      >
        {mode && <AuthForm key={mode} mode={mode} />}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileView() {
  const { user, loading, sessionError, openAuth, signOut } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function logOut() {
    if (pending) return;
    setPending(true);
    setError("");
    try { await signOut(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We couldn’t log you out. Please try again."); }
    finally { setPending(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">YOUR ACCOUNT</p>
        <h1 className="text-4xl font-bold tracking-tight">Profile</h1>
        <p className="leading-relaxed text-muted-foreground">Menus and locations are open to everyone. An account keeps your favorites in one place.</p>
      </div>
      {sessionError && <p role="alert" className="rounded-md border bg-accent p-4 text-sm text-primary">{sessionError}</p>}
      <Card>
        <CardHeader>
          <UserRound className="mb-2 size-6 text-primary" aria-hidden="true" />
          <CardTitle><h2>{loading ? "Checking your account…" : user ? (user.name || "Your account") : "You’re browsing as a guest"}</h2></CardTitle>
          <CardDescription>{user ? "Your account details." : "You don’t need an account to explore Home, Map, or Menus."}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p role="status" className="text-sm text-muted-foreground">Just a moment.</p> : user ? (
            <div className="space-y-5">
              <dl className="space-y-1 text-sm"><dt className="text-muted-foreground">Email</dt><dd className="break-words font-medium">{user.email}</dd></dl>
              {error && <p role="alert" className="text-sm text-primary">{error}</p>}
              <Button variant="outline" onClick={logOut} disabled={pending}>{pending ? "Logging out…" : "Log out"}</Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => openAuth("signup")}>Sign up</Button>
              <Button variant="outline" onClick={() => openAuth("login")}>Log in</Button>
              <Button asChild variant="ghost"><Link href="/menus">Browse menus</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Heart className="mb-2 size-6 text-primary" aria-hidden="true" />
          <CardTitle><h2>Your favorites</h2></CardTitle>
          <CardDescription>{user ? "Your saved dining picks will appear here when favorites are available." : "Log in or sign up to save favorites when they become available."}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

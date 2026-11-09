"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Heart, Plus, ShieldAlert, UserRound, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type EditableListProps = {
  title: string;
  description: string;
  placeholder: string;
  emptyLabel: string;
  items: string[];
  onAdd(value: string): Promise<void>;
  onRemove(value: string): Promise<void>;
};

function EditableList({ title, description, placeholder, emptyLabel, items, onAdd, onRemove }: EditableListProps) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState("");

  function failWith(cause: unknown) {
    setListError(cause instanceof Error ? cause.message : "We couldn’t save that. Please try again.");
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setListError("");
    try { await onAdd(value); setValue(""); }
    catch (cause) { failWith(cause); }
    finally { setPending(false); }
  }

  async function remove(item: string) {
    if (pending) return;
    setPending(true);
    setListError("");
    try { await onRemove(item); }
    catch (cause) { failWith(cause); }
    finally { setPending(false); }
  }

  return (
    <form onSubmit={add} className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {items.length ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item} className="inline-flex items-center gap-1.5 rounded-full border bg-accent px-3 py-1 text-sm font-medium">
              {item}
              <button type="button" aria-label={`Remove ${item}`} disabled={pending} onClick={() => { void remove(item); }} className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50">
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}
      {listError && <p role="alert" className="text-sm text-primary">{listError}</p>}
      <div className="flex flex-wrap gap-2">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          aria-label={`Add to ${title.toLowerCase()}`}
          disabled={pending}
          className="max-w-xs"
        />
        <Button type="submit" variant="outline" disabled={pending || !value.trim()}>
          <Plus className="size-4" aria-hidden="true" />
          Add
        </Button>
      </div>
    </form>
  );
}

export function ProfileView() {
  const {
    user, loading, sessionError, openAuth, signOut,
    addAllergy, removeAllergy, addFavoriteFood, removeFavoriteFood,
  } = useAuth();
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
          <ShieldAlert className="mb-2 size-6 text-primary" aria-hidden="true" />
          <CardTitle><h2>Allergies</h2></CardTitle>
          <CardDescription>{user ? "Saved to your account and used to flag menu items." : "Log in or sign up to keep a list of allergies."}</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <EditableList
              title="Allergies"
              description="Add anything you need to avoid. Tap an item to remove it."
              placeholder="e.g. Peanuts"
              emptyLabel="No allergies saved yet."
              items={user.allergies ?? []}
              onAdd={addAllergy}
              onRemove={removeAllergy}
            />
          ) : <p role="status" className="text-sm text-muted-foreground">Sign in to manage allergies.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Heart className="mb-2 size-6 text-primary" aria-hidden="true" />
          <CardTitle><h2>Your favorites</h2></CardTitle>
          <CardDescription>{user ? "Foods you like, saved to your account." : "Log in or sign up to save favorites."}</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <EditableList
              title="Favorite foods"
              description="Add anything you like eating. Tap an item to remove it."
              placeholder="e.g. Pizza"
              emptyLabel="No favorites saved yet."
              items={user.favoriteFoods ?? []}
              onAdd={addFavoriteFood}
              onRemove={removeFavoriteFood}
            />
          ) : <p role="status" className="text-sm text-muted-foreground">Sign in to save favorites.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

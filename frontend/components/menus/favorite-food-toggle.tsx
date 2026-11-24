"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Star } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { isMenuItemId } from "@/lib/auth";
import type { MenuFood } from "@/lib/menus/types";

function AccountFavoriteToggle({ food }: { food: MenuFood }) {
  const { user, loading, openAuth, setFavoriteMenuItem, isFavoriteMenuItemSaving } = useAuth();
  const [error, setError] = useState("");
  const clicked = useRef(false);
  const saving = isFavoriteMenuItemSaving(food.id);
  const favorites = user?.favoriteMenuItems;
  const known = Boolean(user?.id && favorites);
  const starred = favorites?.some(item => item.menuItemId === food.id) === true;
  const label = loading ? "Loading favorite status" : !user ? `Log in to favorite ${food.name}`
    : !known ? "Favorite status unavailable" : `${starred ? "Unfavorite" : "Favorite"} ${food.name}`;

  async function toggle() {
    if (clicked.current || saving || loading) return;
    if (!user) { openAuth("login"); return; }
    if (!known) return;
    clicked.current = true;
    setError("");
    try { await setFavoriteMenuItem(food, !starred); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We couldn’t save your favorite. Please try again."); }
    finally { clicked.current = false; }
  }

  return <div className="space-y-2">
    <Button type="button" variant="outline" size="sm" onClick={toggle} aria-label={label}
      aria-pressed={known ? starred : undefined} aria-busy={saving} disabled={loading || saving || Boolean(user && !known)}>
      {loading || saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        : <Star className="size-4 text-primary" fill={starred ? "currentColor" : "none"} aria-hidden="true" />}
      {saving ? "Saving…" : starred ? "Favorited" : "Favorite"}
    </Button>
    {user && !loading && !known && <p role="status" className="text-sm text-muted-foreground">Favorite status is unavailable. Refresh the page to try again.</p>}
    {error && <p role="alert" className="text-sm text-primary">{error}</p>}
  </div>;
}

export function FavoriteFoodToggle({ food }: { food: MenuFood }) {
  // Development fixtures use slugs, not database IDs; never send those to a write endpoint.
  return isMenuItemId(food.id) ? <AccountFavoriteToggle key={food.id} food={food} /> : null;
}

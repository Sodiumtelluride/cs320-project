"use client";

import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type LoginButtonProps = {
  className?: string;
};

export function LoginButton({ className }: LoginButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className={className}>
          <LogIn aria-hidden="true" className="size-4" />
          Log in
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Sign in is coming soon</DialogTitle>
          <DialogDescription>
            You can explore dining information without an account. Favorites and
            account sign-in will be available in a future update.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

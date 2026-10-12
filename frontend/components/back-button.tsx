import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

type BackButtonProps = {
  href?: string;
  className?: string;
};

export function BackButton({ href = "/", className }: BackButtonProps) {
  return (
    <Button asChild variant="outline" className={className}>
      <Link href={href}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back
      </Link>
    </Button>
  );
}

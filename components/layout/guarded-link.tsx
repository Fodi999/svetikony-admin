"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes } from "react";
import { useUnsavedChanges } from "@/components/feedback/unsaved-changes-context";

type GuardedLinkProps = LinkProps & AnchorHTMLAttributes<HTMLAnchorElement>;

/** Drop-in replacement for next/link that respects unsaved-changes guarding. */
export function GuardedLink({ href, onClick, ...props }: GuardedLinkProps) {
  const router = useRouter();
  const { guardNavigation } = useUnsavedChanges();

  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        guardNavigation(() => router.push(href.toString()));
      }}
      {...props}
    />
  );
}

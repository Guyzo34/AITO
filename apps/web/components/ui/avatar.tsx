import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Avatar(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "flex size-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10",
        props.className
      )}
    />
  );
}

export function AvatarFallback(props: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn("text-sm font-semibold uppercase tracking-[0.12em]", props.className)}
    />
  );
}
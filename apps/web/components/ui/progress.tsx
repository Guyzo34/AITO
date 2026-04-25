import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Progress(
  props: HTMLAttributes<HTMLDivElement> & { value: number }
) {
  const { className, value, ...rest } = props;

  return (
    <div
      {...rest}
      className={cn("h-2 overflow-hidden rounded-full bg-white/10", className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
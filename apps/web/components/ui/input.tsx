import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "flex h-11 w-full rounded-lg border border-border bg-input px-4 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-primary focus:ring-2 focus:ring-ring",
        props.className
      )}
    />
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground card-shadow",
        props.className
      )}
    />
  );
}

export function CardHeader(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("flex flex-col p-6", props.className)} />;
}

export function CardTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} className={cn("text-xl font-semibold text-foreground", props.className)} />;
}

export function CardDescription(props: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={cn("text-sm text-muted-foreground", props.className)} />;
}

export function CardContent(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("px-6 pb-6", props.className)} />;
}

export function CardFooter(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("flex items-center px-6 pb-6", props.className)} />;
}

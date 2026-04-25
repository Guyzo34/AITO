import { cn } from "@/lib/utils";
export function Textarea(props) {
    return (<textarea {...props} className={cn("flex min-h-28 w-full rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/30", props.className)}/>);
}

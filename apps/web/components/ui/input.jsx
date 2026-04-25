import { cn } from "@/lib/utils";
export function Input(props) {
    return (<input {...props} className={cn("flex h-12 w-full rounded-[1rem] border border-white/10 bg-black/20 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:ring-2 focus:ring-primary/30", props.className)}/>);
}

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
export function Select(props) {
    return (<div className="relative">
      <select {...props} className={cn("flex h-12 w-full appearance-none rounded-[1rem] border border-white/10 bg-black/20 px-4 pr-11 text-sm text-foreground focus:ring-2 focus:ring-primary/30", props.className)}/>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
    </div>);
}

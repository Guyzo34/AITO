import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
export function Label(props) {
    return (<LabelPrimitive.Root {...props} className={cn("text-sm font-medium text-foreground", props.className)}/>);
}

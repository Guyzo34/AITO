import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.18em]", {
    variants: {
        variant: {
            default: "border-primary/30 bg-primary/15 text-primary",
            secondary: "border-white/10 bg-white/10 text-white/85",
            outline: "border-white/15 bg-transparent text-white/75"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
export function Badge(props) {
    const { className, variant, ...rest } = props;
    return <div {...rest} className={cn(badgeVariants({ variant }), className)}/>;
}

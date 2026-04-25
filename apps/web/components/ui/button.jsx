import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50", {
    variants: {
        variant: {
            default: "bg-white text-background shadow-[0_14px_40px_rgba(255,255,255,0.12)] hover:bg-white/90",
            secondary: "border border-white/10 bg-white/10 text-white hover:bg-white/15",
            outline: "border border-white/15 bg-transparent text-white hover:bg-white/5"
        },
        size: {
            default: "h-11 px-5",
            lg: "h-12 px-6 text-sm",
            icon: "size-10 rounded-full"
        }
    },
    defaultVariants: {
        variant: "default",
        size: "default"
    }
});
export function Button(props) {
    const { asChild, className, size, variant, ...rest } = props;
    const Comp = asChild ? Slot : "button";
    return (<Comp className={cn(buttonVariants({ size, variant }), className)} {...rest}/>);
}

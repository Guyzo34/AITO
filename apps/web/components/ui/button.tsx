import type { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        /* Bouton principal orange */
        default:
          "bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]",
        /* Bouton vert secondaire */
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]",
        /* Bouton contour orange */
        outline:
          "border border-primary text-primary bg-transparent hover:bg-accent hover:text-accent-foreground",
        /* Bouton fantôme */
        ghost:
          "text-foreground hover:bg-muted hover:text-primary",
        /* Bouton destructif */
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90"
      },
      size: {
        default: "h-11 px-6",
        sm:      "h-9 px-4 text-xs",
        lg:      "h-13 px-8 text-base",
        icon:    "size-10 rounded-full"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button(props: ButtonProps) {
  const { asChild, className, size, variant, ...rest } = props;
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ size, variant }), className)}
      {...rest}
    />
  );
}

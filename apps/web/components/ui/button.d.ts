import type { ButtonHTMLAttributes } from "react";
import { type VariantProps } from "class-variance-authority";
declare const buttonVariants: (props?: ({
    variant?: "default" | "secondary" | "outline" | null | undefined;
    size?: "default" | "lg" | "icon" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
};
export declare function Button(props: ButtonProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=button.d.ts.map
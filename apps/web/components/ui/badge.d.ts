import type { HTMLAttributes } from "react";
import { type VariantProps } from "class-variance-authority";
declare const badgeVariants: (props?: ({
    variant?: "default" | "secondary" | "outline" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
export declare function Badge(props: HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>): import("react").JSX.Element;
export {};
//# sourceMappingURL=badge.d.ts.map
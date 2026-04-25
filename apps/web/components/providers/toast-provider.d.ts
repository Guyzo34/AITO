import type { ReactNode } from "react";
type ToastVariant = "default" | "destructive";
type ToastInput = {
    title: string;
    description: string;
    variant?: ToastVariant;
};
type ToastContextValue = {
    toast: (input: ToastInput) => void;
};
export declare function ToastProvider(props: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useToast(): ToastContextValue;
export {};
//# sourceMappingURL=toast-provider.d.ts.map
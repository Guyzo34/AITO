"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "destructive";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

type ToastRecord = ToastInput & { id: string };

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider(props: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, ...input }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {props.children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4">
        {toasts.map((item) => {
          const isDestructive = item.variant === "destructive";
          return (
            <div
              key={item.id}
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-4 shadow-lg",
                isDestructive
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-green-200 bg-green-50 text-green-900"
              )}
            >
              <div className={cn("mt-0.5 shrink-0", isDestructive ? "text-red-500" : "text-green-500")}>
                {isDestructive ? (
                  <XCircle className="size-5" />
                ) : (
                  <CheckCircle2 className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm leading-6 opacity-80">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-full p-1 opacity-60 transition hover:opacity-100"
                onClick={() => dismiss(item.id)}
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast doit être utilisé dans ToastProvider.");
  }

  return context;
}

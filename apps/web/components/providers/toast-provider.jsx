"use client";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
const ToastContext = createContext(null);
export function ToastProvider(props) {
    const [toasts, setToasts] = useState([]);
    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);
    const toast = useCallback((input) => {
        const id = crypto.randomUUID();
        const record = { id, ...input };
        setToasts((current) => [...current, record]);
        window.setTimeout(() => dismiss(id), 5000);
    }, [dismiss]);
    const value = useMemo(() => ({ toast }), [toast]);
    return (<ToastContext.Provider value={value}>
      {props.children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4">
        {toasts.map((item) => {
            const destructive = item.variant === "destructive";
            return (<div key={item.id} className={cn("pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[1.5rem] border px-4 py-4 shadow-2xl backdrop-blur-xl", destructive
                    ? "border-red-400/30 bg-red-500/10 text-red-50"
                    : "border-white/10 bg-zinc-950/90 text-white")}>
              <div className={cn("mt-0.5 rounded-full p-1.5", destructive ? "bg-red-500/20 text-red-200" : "bg-emerald-400/15 text-emerald-200")}>
                {destructive ? <AlertCircle className="size-4"/> : <CheckCircle2 className="size-4"/>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-white/75">{item.description}</p>
              </div>
              <button type="button" className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white" onClick={() => dismiss(item.id)}>
                <X className="size-4"/>
              </button>
            </div>);
        })}
      </div>
    </ToastContext.Provider>);
}
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast doit être utilisé dans ToastProvider.");
    }
    return context;
}

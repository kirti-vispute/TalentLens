"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error" | "info";
}

interface ToastContextValue {
  push: (message: string, tone?: ToastItem["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 sm:items-end sm:right-4 sm:left-auto">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg backdrop-blur ${
                t.tone === "success"
                  ? "border-success/30 bg-success-soft text-success"
                  : t.tone === "error"
                    ? "border-danger/30 bg-danger-soft text-danger"
                    : "border-border bg-surface text-foreground"
              }`}
              role="status"
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Keep the app usable even if a toast fires outside the provider —
    // never let a notification failure break the underlying action.
    return { push: () => {} };
  }
  return ctx;
}

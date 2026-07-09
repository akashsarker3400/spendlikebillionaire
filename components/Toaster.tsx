"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "@/lib/toast";
import { cn } from "@/lib/utils";

const VARIANT_STYLES: Record<string, string> = {
  default: "bg-ink text-white dark:bg-white dark:text-ink",
  error: "bg-red-600 text-white",
  celebrate:
    "bg-gradient-to-r from-accent to-indigo-500 text-white shadow-lift",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            layout
            onClick={() => dismiss(t.id)}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "pointer-events-auto max-w-md rounded-lg px-4 py-2.5 text-sm font-medium shadow-lift",
              VARIANT_STYLES[t.variant] ?? VARIANT_STYLES.default,
            )}
          >
            {t.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

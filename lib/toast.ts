import { create } from "zustand";
import { uid } from "@/lib/utils";

export type ToastVariant = "default" | "error" | "celebrate";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

const MAX_VISIBLE = 3;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  push: (message, variant = "default", durationMs = 3200) => {
    const id = uid();
    set({ toasts: [...get().toasts, { id, message, variant }].slice(-MAX_VISIBLE) });
    if (typeof window !== "undefined") {
      window.setTimeout(() => get().dismiss(id), durationMs);
    }
  },

  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (
  message: string,
  variant: ToastVariant = "default",
  durationMs?: number,
) => useToastStore.getState().push(message, variant, durationMs);

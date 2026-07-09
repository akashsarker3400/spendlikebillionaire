"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCompact } from "@/lib/format";
import { encodeHaul, type Haul } from "@/lib/haul";
import { playSound } from "@/lib/sounds";
import { SHARE_TARGETS, currentOrigin, haulUrl, shareText } from "@/lib/share";
import { useGameStore, useNickname } from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  /** The haul to share, without a nickname — this sheet attaches one. */
  haul: Omit<Haul, "nickname">;
}

/**
 * Turns a run into a link. The entire receipt lives inside the URL, so there is
 * nothing to upload and the link works forever, offline, with no account.
 */
export function ShareSheet({ open, onClose, haul }: ShareSheetProps) {
  const savedNickname = useNickname();
  const setNickname = useGameStore((s) => s.setNickname);
  const [draft, setDraft] = useState(savedNickname);
  const [copied, setCopied] = useState(false);

  useEffect(() => setDraft(savedNickname), [savedNickname, open]);

  const fullHaul = useMemo<Haul>(
    () => ({ ...haul, nickname: draft.trim() || undefined }),
    [haul, draft],
  );

  const url = useMemo(() => haulUrl(currentOrigin(), fullHaul), [fullHaul]);
  const text = useMemo(() => shareText(fullHaul), [fullHaul]);
  const code = useMemo(() => encodeHaul(fullHaul), [fullHaul]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const commitNickname = useCallback(() => {
    const next = draft.trim().slice(0, 20);
    if (next !== savedNickname) setNickname(next);
  }, [draft, savedNickname, setNickname]);

  const onCopy = useCallback(async () => {
    commitNickname();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      playSound("purchase");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Couldn't copy. Long-press the link instead.", "error");
    }
  }, [commitNickname, url]);

  const onNativeShare = useCallback(async () => {
    commitNickname();
    const data = { title: "Spend Like a Billionaire", text, url };
    if (!navigator.canShare?.(data)) {
      void onCopy();
      return;
    }
    try {
      await navigator.share(data);
      playSound("purchase");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      void onCopy();
    }
  }, [commitNickname, onCopy, text, url]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Share your haul"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line bg-[var(--bg)] pb-[env(safe-area-inset-bottom)] sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />

            <div className="px-5 pb-6 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">
                    Share your haul
                  </h2>
                  <p className="tnum mt-1 text-xs text-subtle">
                    {formatCompact(haul.spent)} spent · the whole receipt fits in
                    the link
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close share sheet"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-canvas hover:text-ink dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-medium text-subtle">
                  Sign it (optional)
                </span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitNickname}
                  maxLength={20}
                  placeholder="Your nickname"
                  className="mt-1.5 h-11 w-full rounded-lg border border-line bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent"
                />
              </label>

              <button
                type="button"
                onClick={onNativeShare}
                className="mt-4 w-full rounded-lg bg-accent px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Share
              </button>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {SHARE_TARGETS.map((target) => (
                  <a
                    key={target.id}
                    href={target.href(url, text)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={commitNickname}
                    className="flex flex-col items-center gap-1.5 rounded-lg border border-line py-2.5 transition-colors hover:bg-canvas dark:hover:bg-white/5"
                  >
                    <span className="text-lg leading-none" aria-hidden>
                      {target.emoji}
                    </span>
                    <span className="text-[10px] font-medium text-subtle">
                      {target.label}
                    </span>
                  </a>
                ))}
              </div>

              <button
                type="button"
                onClick={onCopy}
                className={cn(
                  "mt-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
                  copied ? "border-accent bg-accent-soft dark:bg-accent/10" : "border-line",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-subtle">
                  {url}
                </span>
                <span className="shrink-0 text-xs font-medium text-accent">
                  {copied ? "Copied" : "Copy"}
                </span>
              </button>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-subtle">
                {code.length} characters. No account, no server, no expiry.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

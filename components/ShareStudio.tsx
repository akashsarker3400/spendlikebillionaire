"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FORMATS,
  ShareImage,
  TEMPLATES,
  type FormatId,
  type TemplateId,
} from "@/components/ShareImage";
import { formatCompact } from "@/lib/format";
import { encodeHaul, type Haul } from "@/lib/haul";
import { playSound } from "@/lib/sounds";
import { SHARE_TARGETS, currentOrigin, haulUrl, shareText } from "@/lib/share";
import { useGameStore, useNickname } from "@/lib/store";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { Billionaire } from "@/types";

interface ShareStudioProps {
  open: boolean;
  onClose: () => void;
  billionaire: Billionaire;
  /** The haul to share, without a nickname — this sheet attaches one. */
  haul: Omit<Haul, "nickname">;
}

/** Preview is scaled down in CSS; the export always renders at full pixel size. */
const PREVIEW_MAX_W = 340;
const PREVIEW_MAX_H = 400;

export function ShareStudio({ open, onClose, billionaire, haul }: ShareStudioProps) {
  const savedNickname = useNickname();
  const setNickname = useGameStore((s) => s.setNickname);

  const [draft, setDraft] = useState(savedNickname);
  const [template, setTemplate] = useState<TemplateId>("poster");
  const [format, setFormat] = useState<FormatId>("square");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(savedNickname), [savedNickname, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const fullHaul = useMemo<Haul>(
    () => ({ ...haul, nickname: draft.trim() || undefined }),
    [haul, draft],
  );

  const url = useMemo(() => haulUrl(currentOrigin(), fullHaul), [fullHaul]);
  const text = useMemo(() => shareText(fullHaul), [fullHaul]);
  const code = useMemo(() => encodeHaul(fullHaul), [fullHaul]);

  const fmt = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  const scale = Math.min(PREVIEW_MAX_W / fmt.width, PREVIEW_MAX_H / fmt.height);

  const commitNickname = useCallback(() => {
    const next = draft.trim().slice(0, 20);
    if (next !== savedNickname) setNickname(next);
  }, [draft, savedNickname, setNickname]);

  const renderPng = useCallback(async (): Promise<Blob | null> => {
    const node = cardRef.current;
    if (!node) return null;

    const { toBlob } = await import("html-to-image");
    return toBlob(node, {
      // The node is CSS-scaled for the preview. Undo it on the clone so the
      // export is full-resolution, not a scaled-down thumbnail.
      style: { transform: "none", transformOrigin: "top left" },
      width: fmt.width,
      height: fmt.height,
      pixelRatio: 1,
      cacheBust: true,
      // Product photos are same-origin; the fonts are a system stack, so there
      // is nothing to embed and skipping the CSS fetch avoids a CORS failure.
      skipFonts: true,
      backgroundColor: template === "card" ? "#ffffff" : undefined,
    });
  }, [fmt.height, fmt.width, template]);

  const filename = `spend-like-a-billionaire-${template}-${format}.png`;

  const onDownload = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    commitNickname();
    try {
      const blob = await renderPng();
      if (!blob) throw new Error("nothing rendered");
      downloadBlob(blob, filename);
      playSound("purchase");
      toast("Image saved. Post it.");
    } catch {
      toast("Couldn't render the image.", "error");
    } finally {
      setBusy(false);
    }
  }, [busy, commitNickname, filename, renderPng]);

  const onShareImage = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    commitNickname();
    try {
      const blob = await renderPng();
      if (!blob) throw new Error("nothing rendered");

      const file = new File([blob], filename, { type: "image/png" });
      const data = { files: [file], text: `${text} ${url}` };

      if (navigator.canShare?.(data)) {
        await navigator.share(data);
        playSound("purchase");
        return;
      }
      // Desktop browsers mostly can't share files. Downloading is the honest
      // fallback — the user posts it themselves.
      downloadBlob(blob, filename);
      toast("Image saved to your downloads.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("Couldn't share the image.", "error");
    } finally {
      setBusy(false);
    }
  }, [busy, commitNickname, filename, renderPng, text, url]);

  const onCopyLink = useCallback(async () => {
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[3px]"
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Share your haul"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[94dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-[var(--bg)] pb-[max(1rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-line bg-[var(--bg)] px-5 pb-3 pt-4">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Share your haul</h2>
                <p className="tnum mt-0.5 text-xs text-subtle">
                  {formatCompact(haul.spent)} spent · pick a look
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

            <div className="px-5 pt-4">
              {/* ----------------------------------------------------- preview */}
              {/* Height follows the card, so a 1200x630 wide preview doesn't
                  float in 400px of empty box. */}
              <div
                className="mx-auto flex items-center justify-center overflow-hidden rounded-xl border border-line bg-canvas p-3 dark:bg-white/[0.03]"
                style={{ height: fmt.height * scale + 24 }}
              >
                <div
                  style={{
                    width: fmt.width * scale,
                    height: fmt.height * scale,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: "top left",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  >
                    <ShareImage
                      ref={cardRef}
                      haul={fullHaul}
                      billionaire={billionaire}
                      template={template}
                      format={format}
                    />
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------- controls */}
              <div className="mt-4 grid grid-cols-3 gap-1.5">
                {TEMPLATES.map((t) => (
                  <Chip
                    key={t.id}
                    active={template === t.id}
                    onClick={() => setTemplate(t.id)}
                    label={t.label}
                  />
                ))}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {FORMATS.map((f) => (
                  <Chip
                    key={f.id}
                    active={format === f.id}
                    onClick={() => setFormat(f.id)}
                    label={f.label}
                    sub={f.hint}
                  />
                ))}
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-medium text-subtle">Sign it (optional)</span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitNickname}
                  maxLength={20}
                  placeholder="Your nickname"
                  className="mt-1.5 h-11 w-full rounded-lg border border-line bg-transparent px-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent"
                />
              </label>

              {/* ----------------------------------------------------- actions */}
              <button
                type="button"
                onClick={onShareImage}
                disabled={busy}
                className="mt-4 w-full rounded-lg bg-accent px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {busy ? "Rendering…" : "Share image"}
              </button>

              <button
                type="button"
                onClick={onDownload}
                disabled={busy}
                className="mt-2 w-full rounded-lg border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-canvas disabled:opacity-60 dark:hover:bg-white/5"
              >
                Download PNG · {fmt.width}×{fmt.height}
              </button>

              <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs font-medium text-subtle">
                  Or send the link — they can steal your haul
                </p>

                <div className="mt-2.5 grid grid-cols-5 gap-2">
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
                      <span className="text-[10px] font-medium text-subtle">{target.label}</span>
                    </a>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onCopyLink}
                  className={cn(
                    "mt-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors",
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

                <p className="mt-2.5 text-center text-[11px] leading-relaxed text-subtle">
                  {code.length} characters. No account, no server, no expiry.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Chip({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
        active
          ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink"
          : "border-line text-subtle hover:text-ink dark:hover:text-white",
      )}
    >
      {label}
      {sub && (
        <span className={cn("mt-0.5 block text-[10px] font-normal", active ? "opacity-70" : "opacity-60")}>
          {sub}
        </span>
      )}
    </button>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

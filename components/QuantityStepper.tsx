"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatCount } from "@/lib/format";
import { cn, parseIntegerInput } from "@/lib/utils";

/** Delay before a held button starts repeating. */
const HOLD_DELAY_MS = 380;
const MIN_INTERVAL_MS = 45;
const START_INTERVAL_MS = 190;

/** After this many repeats, each tick starts moving more than one unit. */
const STEP_LADDER: Array<{ afterTicks: number; step: number }> = [
  { afterTicks: 40, step: 500 },
  { afterTicks: 30, step: 100 },
  { afterTicks: 20, step: 25 },
  { afterTicks: 12, step: 5 },
  { afterTicks: 0, step: 1 },
];

function stepForTick(ticks: number): number {
  return STEP_LADDER.find((rung) => ticks >= rung.afterTicks)?.step ?? 1;
}

interface QuantityStepperProps {
  quantity: number;
  canIncrement: boolean;
  onIncrement: (amount: number) => void;
  onDecrement: (amount: number) => void;
  onSetQuantity: (quantity: number) => void;
  /** Fired when the user pokes a disabled "+". */
  onRejected: () => void;
  label: string;
}

export function QuantityStepper({
  quantity,
  canIncrement,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onRejected,
  label,
}: QuantityStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Hold-to-repeat lives in refs: the timer must not restart on every render.
  const timerRef = useRef<number | null>(null);
  const ticksRef = useRef(0);
  // The "+" handler must see today's affordability, not the value captured when the hold began.
  const canIncrementRef = useRef(canIncrement);
  canIncrementRef.current = canIncrement;

  const stopRepeat = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    ticksRef.current = 0;
  }, []);

  useEffect(() => stopRepeat, [stopRepeat]);

  const startRepeat = useCallback(
    (direction: "up" | "down") => {
      stopRepeat();

      const tick = () => {
        ticksRef.current += 1;
        const step = stepForTick(ticksRef.current);

        if (direction === "up") {
          if (!canIncrementRef.current) {
            stopRepeat();
            return;
          }
          onIncrement(step);
        } else {
          onDecrement(step);
        }

        const interval = Math.max(
          MIN_INTERVAL_MS,
          START_INTERVAL_MS - ticksRef.current * 7,
        );
        timerRef.current = window.setTimeout(tick, interval);
      };

      timerRef.current = window.setTimeout(tick, HOLD_DELAY_MS);
    },
    [onDecrement, onIncrement, stopRepeat],
  );

  const pressIncrement = () => {
    if (!canIncrement) {
      onRejected();
      return;
    }
    onIncrement(1);
    startRepeat("up");
  };

  const pressDecrement = () => {
    if (quantity <= 0) return;
    onDecrement(1);
    startRepeat("down");
  };

  const commitDraft = () => {
    setEditing(false);
    const next = parseIntegerInput(draft);
    if (next !== quantity) onSetQuantity(next);
  };

  const startEditing = () => {
    setDraft(String(quantity));
    setEditing(true);
    // The input doesn't exist until the state flush lands.
    window.setTimeout(() => inputRef.current?.select(), 0);
  };

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border border-line">
      <StepButton
        ariaLabel={`Remove one ${label}`}
        disabled={quantity <= 0}
        onPress={pressDecrement}
        onRelease={stopRepeat}
      >
        <MinusIcon />
      </StepButton>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          aria-label={`Quantity of ${label}`}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitDraft();
            if (e.key === "Escape") setEditing(false);
          }}
          className="tnum w-full min-w-0 border-x border-line bg-transparent px-1 text-center text-sm font-medium outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          aria-label={`Set quantity of ${label}, currently ${quantity}`}
          title="Tap to type an exact quantity"
          className={cn(
            "tnum w-full min-w-0 border-x border-line px-1 text-center text-sm font-medium tabular-nums transition-colors hover:bg-canvas dark:hover:bg-white/5",
            quantity === 0 && "text-subtle",
          )}
        >
          {formatCount(quantity)}
        </button>
      )}

      <StepButton
        ariaLabel={`Add one ${label}`}
        disabled={false}
        dimmed={!canIncrement}
        onPress={pressIncrement}
        onRelease={stopRepeat}
      >
        <PlusIcon />
      </StepButton>
    </div>
  );
}

interface StepButtonProps {
  children: React.ReactNode;
  ariaLabel: string;
  disabled: boolean;
  dimmed?: boolean;
  onPress: () => void;
  onRelease: () => void;
}

/**
 * The "+" uses aria-disabled rather than `disabled` so an unaffordable tap still
 * reaches the click handler and can shake the card at you.
 */
function StepButton({
  children,
  ariaLabel,
  disabled,
  dimmed = false,
  onPress,
  onRelease,
}: StepButtonProps) {
  // Hold-to-repeat needs `pointerdown`, but Voice Control and other assistive
  // tech dispatch a bare `click` with no pointer events at all. Handle both, and
  // use this flag so a real mouse press doesn't fire onPress twice.
  const handledByPointer = useRef(false);

  const endPress = () => {
    handledByPointer.current = false;
    onRelease();
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      aria-disabled={disabled || dimmed}
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        handledByPointer.current = true;
        onPress();
      }}
      onClick={() => {
        if (disabled) return;
        // A real pointer press already ran onPress; this click just closes it out.
        if (handledByPointer.current) {
          handledByPointer.current = false;
          return;
        }
        onPress();
        onRelease();
      }}
      onPointerUp={onRelease}
      onPointerCancel={endPress}
      onPointerLeave={onRelease}
      onKeyDown={(e) => {
        // preventDefault stops the browser synthesising a click on top of this.
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!e.repeat) onPress();
        }
      }}
      onKeyUp={onRelease}
      onBlur={onRelease}
      className={cn(
        "grid h-9 w-9 shrink-0 select-none place-items-center transition-colors",
        disabled || dimmed
          ? "text-subtle/40"
          : "text-ink hover:bg-canvas active:bg-line dark:text-white dark:hover:bg-white/5",
      )}
    >
      {children}
    </button>
  );
}

function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

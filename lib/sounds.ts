import { useGameStore } from "@/lib/store";

/**
 * Sounds are synthesised with the Web Audio API rather than shipped as audio
 * files: nothing to download, nothing to 404, and the AudioContext is only
 * constructed on the first real interaction (browsers block it before that).
 */

export type SoundName = "click" | "purchase" | "refund" | "error" | "milestone";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;

  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

interface ToneOptions {
  frequency: number;
  /** Seconds from now. */
  startAt?: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  /** Glide to this frequency over the tone's duration. */
  slideTo?: number;
}

function tone(context: AudioContext, options: ToneOptions): void {
  const {
    frequency,
    startAt = 0,
    duration = 0.12,
    type = "sine",
    gain = 0.08,
    slideTo,
  } = options;

  const start = context.currentTime + startAt;
  const end = start + duration;

  const osc = context.createOscillator();
  const amp = context.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  if (slideTo !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), end);
  }

  // Fast attack, exponential decay — reads as a "tick" rather than a "beep".
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(amp);
  amp.connect(context.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

const RECIPES: Record<SoundName, (context: AudioContext) => void> = {
  click: (c) => tone(c, { frequency: 900, duration: 0.04, type: "triangle", gain: 0.05 }),

  purchase: (c) => {
    tone(c, { frequency: 1318.5, duration: 0.09, type: "triangle", gain: 0.07 });
    tone(c, { frequency: 1975.5, startAt: 0.07, duration: 0.16, type: "triangle", gain: 0.06 });
  },

  refund: (c) => {
    tone(c, { frequency: 1200, duration: 0.06, type: "triangle", gain: 0.05 });
    tone(c, { frequency: 800, startAt: 0.05, duration: 0.09, type: "triangle", gain: 0.045 });
  },

  error: (c) =>
    tone(c, {
      frequency: 190,
      slideTo: 110,
      duration: 0.18,
      type: "sawtooth",
      gain: 0.05,
    }),

  milestone: (c) => {
    // C5 – E5 – G5 – C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, i) => {
      tone(c, {
        frequency,
        startAt: i * 0.085,
        duration: i === notes.length - 1 ? 0.45 : 0.16,
        type: "triangle",
        gain: 0.07,
      });
    });
  },
};

export function playSound(name: SoundName): void {
  if (!useGameStore.getState().soundEnabled) return;

  const context = getContext();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume().catch(() => {});
  }

  try {
    RECIPES[name](context);
  } catch {
    // A dead AudioContext should never take the page down with it.
  }
}

/** Warms up the context on the first user gesture so the first sound isn't swallowed. */
export function unlockAudio(): void {
  const context = getContext();
  if (context && context.state === "suspended") {
    void context.resume().catch(() => {});
  }
}

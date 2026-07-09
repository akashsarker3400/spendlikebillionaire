"use client";

import { playSound, unlockAudio } from "@/lib/sounds";
import { useGameStore, useSoundEnabled } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

export function SoundToggle() {
  const mounted = useMounted();
  const enabled = useSoundEnabled();
  const toggleSound = useGameStore((s) => s.toggleSound);

  const onClick = () => {
    unlockAudio();
    toggleSound();
    // Reads the new value, so this only fires when turning sound on.
    playSound("click");
  };

  const on = mounted ? enabled : true;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? "Mute sounds" : "Unmute sounds"}
      className="grid h-9 w-9 place-items-center rounded-lg border border-line text-subtle transition-colors hover:bg-canvas hover:text-ink dark:hover:bg-white/5 dark:hover:text-white"
    >
      {on ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
    </button>
  );
}

function SpeakerOnIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5 6 9H3v6h3l5 4V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5 6 9H3v6h3l5 4V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m16 9 5 6m0-6-5 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

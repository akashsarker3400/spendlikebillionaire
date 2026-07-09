/** Lazily loaded — the confetti bundle never touches the critical path. */
export async function burstConfetti(intensity: number): Promise<void> {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  try {
    const confetti = (await import("canvas-confetti")).default;

    confetti({
      particleCount: Math.round(60 + intensity * 90),
      spread: 70,
      startVelocity: 42,
      origin: { y: 0.7 },
      disableForReducedMotion: true,
    });

    if (intensity < 1) return;

    // The finale gets wings.
    window.setTimeout(() => {
      void confetti({
        particleCount: 90,
        angle: 60,
        spread: 62,
        origin: { x: 0, y: 0.75 },
        disableForReducedMotion: true,
      });
    }, 140);

    window.setTimeout(() => {
      void confetti({
        particleCount: 90,
        angle: 120,
        spread: 62,
        origin: { x: 1, y: 0.75 },
        disableForReducedMotion: true,
      });
    }, 260);
  } catch {
    // Confetti is decoration. A failed chunk load must not break the game.
  }
}

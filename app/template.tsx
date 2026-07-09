"use client";

import { MotionConfig } from "framer-motion";

/**
 * `template.tsx` remounts on every navigation, which gives each route a fresh
 * enter animation without wiring AnimatePresence around the router.
 *
 * The fade is a CSS keyframe, deliberately NOT a `<motion.div initial={{opacity:0}}>`.
 * Framer serialises `initial` into an inline `style="opacity:0"` on the server, so
 * every page would ship invisible and depend on JS to reveal it — disable
 * JavaScript, block one chunk, or throw during hydration and the whole site is a
 * blank white screen. `animate-fade-in` animates *from* opacity 0, leaving the
 * resting state visible, so a browser that never runs the animation still paints
 * the page.
 *
 * MotionConfig stays: it strips transforms for `prefers-reduced-motion` users
 * across every descendant. Reduced motion is never branched on here, because the
 * server can't know the preference and a differing tree breaks hydration.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="animate-fade-in">{children}</div>
    </MotionConfig>
  );
}

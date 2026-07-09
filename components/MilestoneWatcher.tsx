"use client";

import { useEffect } from "react";
import { MILESTONE_MESSAGES } from "@/data/headlines";
import { burstConfetti } from "@/lib/confetti";
import { playSound } from "@/lib/sounds";
import { toast } from "@/lib/toast";
import { MILESTONES, useGameStore, usePercentSpent } from "@/lib/store";

/** Watches the spend percentage and fires each threshold exactly once per run. */
export function MilestoneWatcher() {
  const percentSpent = usePercentSpent();

  useEffect(() => {
    const { milestonesHit, markMilestone, billionaireId } =
      useGameStore.getState();
    if (!billionaireId) return;

    const crossed = MILESTONES.filter(
      (m) => percentSpent >= m && !milestonesHit.includes(m),
    );
    if (crossed.length === 0) return;

    // One purchase can leap from 10% to 80%. Record every threshold it passed,
    // but only celebrate the highest — four toasts at once is not a celebration.
    for (const milestone of crossed) markMilestone(milestone);

    const highest = crossed[crossed.length - 1]!;
    playSound("milestone");
    void burstConfetti(highest / 100);
    toast(MILESTONE_MESSAGES[highest] ?? `${highest}% spent.`, "celebrate", 4200);
  }, [percentSpent]);

  return null;
}

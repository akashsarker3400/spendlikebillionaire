"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BalanceBar } from "@/components/BalanceBar";
import { CartDrawer } from "@/components/CartDrawer";
import { ChallengeBar } from "@/components/ChallengeBar";
import { FortuneDestroyed } from "@/components/FortuneDestroyed";
import { MilestoneWatcher } from "@/components/MilestoneWatcher";
import { ProductGrid } from "@/components/ProductGrid";
import { SoundToggle } from "@/components/SoundToggle";
import { StatsPanel } from "@/components/StatsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useBillionaireId } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";

export default function ShopPage() {
  const router = useRouter();
  const mounted = useMounted();
  const billionaireId = useBillionaireId();
  const [statsOpen, setStatsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // Landing directly on /shop with no fortune to spend is a dead end.
  useEffect(() => {
    if (mounted && !billionaireId) router.replace("/");
  }, [mounted, billionaireId, router]);

  useEffect(() => {
    router.prefetch("/cart");
    router.prefetch("/checkout");
  }, [router]);

  if (!mounted || !billionaireId) return <ShopSkeleton />;

  return (
    <>
      <MilestoneWatcher />
      <BalanceBar
        onOpenStats={() => setStatsOpen(true)}
        onOpenCart={() => setCartOpen(true)}
      />
      <ChallengeBar />

      <main className="mx-auto w-full max-w-6xl px-5 pb-28 sm:px-8 sm:pb-24">
        <ProductGrid />

        <footer className="mt-8 flex items-center justify-between border-t border-line pt-6">
          <p className="text-xs leading-relaxed text-subtle">
            Prices are estimates. Nothing here is for sale.
          </p>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <ThemeToggle />
          </div>
        </footer>
      </main>

      <StatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <FortuneDestroyed />
    </>
  );
}

/** Matches the real layout's vertical rhythm so nothing jumps on hydration. */
function ShopSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div className="space-y-3 border-b border-line py-4">
        <div className="h-7 w-40 animate-pulse rounded bg-line" />
        <div className="h-12 w-64 animate-pulse rounded bg-line" />
        <div className="h-1 w-full rounded-full bg-line" />
      </div>
      <div className="grid grid-cols-2 gap-3 py-6 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-lg bg-line" />
        ))}
      </div>
    </div>
  );
}

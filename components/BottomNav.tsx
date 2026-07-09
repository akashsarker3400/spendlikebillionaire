"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatCountCompact } from "@/lib/format";
import { useBillionaireId, useCartCount } from "@/lib/store";
import { useMounted } from "@/lib/useMounted";
import { cn } from "@/lib/utils";

/** Routes where a tab bar would be in the way rather than useful. */
const HIDDEN_ON = ["/", "/credits"];

export function BottomNav() {
  const pathname = usePathname();
  const mounted = useMounted();
  const billionaireId = useBillionaireId();
  const cartCount = useCartCount();

  // Shared-haul links are a landing page for strangers, not part of the app shell.
  if (HIDDEN_ON.includes(pathname) || pathname.startsWith("/h/")) return null;
  if (mounted && !billionaireId) return null;

  const tabs = [
    { href: "/shop", label: "Shop", icon: <ShopIcon /> },
    { href: "/cart", label: "Cart", icon: <CartIcon />, badge: mounted ? cartCount : 0 },
    { href: "/achievements", label: "Awards", icon: <TrophyIcon /> },
    { href: "/leaderboard", label: "Ranks", icon: <ChartIcon /> },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#ffffff]/90 backdrop-blur-md dark:bg-[#0a0a0a]/90 sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                // 56px tall: comfortably above the 44px minimum tap target.
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-accent" : "text-subtle",
                )}
              >
                <span className="relative">
                  {tab.icon}
                  {(tab.badge ?? 0) > 0 && (
                    <span className="tnum absolute -right-2.5 -top-1.5 rounded-full bg-accent px-1 py-px text-[9px] font-semibold leading-tight text-white">
                      {formatCountCompact(tab.badge!)}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ShopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16l-1.2 12.1a1.6 1.6 0 0 1-1.6 1.4H6.8a1.6 1.6 0 0 1-1.6-1.4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8.5 9V6.5a3.5 3.5 0 1 1 7 0V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 3h2.2l2.1 11.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.3L19.6 7H5.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1.5" fill="currentColor" />
      <circle cx="17" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 14v3m-3.5 3h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 20V11m7 9V4m7 16v-6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

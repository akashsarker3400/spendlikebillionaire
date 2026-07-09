import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ACHIEVEMENTS_BY_ID } from "@/data/achievements";
import { getBillionaire } from "@/data/billionaires";
import { isConsecutiveDay } from "@/data/dailyChallenges";
import { CHEAPEST_PRICE, PRODUCTS_BY_ID } from "@/data/products";
import type { Haul } from "@/lib/haul";
import type { Billionaire, CartItem, Order } from "@/types";

/**
 * Money is always whole US dollars held in a JS integer. Every price in
 * data/products.ts is an integer, quantities are integers, and the affordability
 * clamp guarantees `totalSpent <= startingBalance` (max ~$930B), so all
 * intermediate values stay far below Number.MAX_SAFE_INTEGER. Never divide money
 * without Math.floor, and never introduce a float price.
 *
 * Funds are reserved the moment an item enters the cart, not at checkout. So:
 *
 *     totalSpent = value(purchased) + value(cart)
 *     remaining  = startingBalance - totalSpent
 *
 * `placeOrder` therefore moves quantities from `cart` into `purchased` and must
 * NOT touch the balance again — the money already left. That's the one rule in
 * this file that's easy to get wrong and impossible to see in the UI.
 */

export type CartMap = Record<string, number>;

const ACHIEVEMENT_XP: Record<string, number> = Object.fromEntries(
  Object.values(ACHIEVEMENTS_BY_ID).map((a) => [a.id, a.xp]),
);

export interface MutationResult {
  /** How many units actually changed hands. */
  applied: number;
  /** How many the caller asked for. */
  requested: number;
  /** True when affordability trimmed the request. */
  clamped: boolean;
  /** Additional units the wallet could have covered at request time. */
  maxAffordable: number;
  /** Quantity in the cart after the mutation. */
  finalQuantity: number;
}

const NO_OP: MutationResult = {
  applied: 0,
  requested: 0,
  clamped: false,
  maxAffordable: 0,
  finalQuantity: 0,
};

/**
 * 100% is deliberately absent: a fortune is almost never divisible by the price
 * of a Big Mac, so the counter stalls a few dollars short. The end of the game
 * is "nothing on the shelf is affordable" (see `useIsFortuneDestroyed`), and
 * FortuneDestroyed owns that celebration.
 */
export const MILESTONES = [25, 50, 75] as const;

/** A shared haul you're trying to beat. */
export interface Challenge {
  nickname: string;
  billionaireId: string;
  targetSpent: number;
  targetPercent: number;
  /** The link this came from, so we can show "beat @nick" and link back. */
  code: string;
}

interface GameState {
  billionaireId: string | null;
  /** Snapshotted at selection time so a live net-worth update can't shift a run mid-session. */
  startingBalance: number;
  /** Reserved but not yet checked out. */
  cart: CartMap;
  /** Checked out. Accumulates across orders within a run. */
  purchased: CartMap;
  orders: Order[];
  lastOrderNumber: number | null;
  startedAt: number | null;
  /** Timestamp of the first moment totalSpent crossed 50% of the fortune. */
  halfwayAt: number | null;
  milestonesHit: number[];
  destroyedSeen: boolean;
  savedToLeaderboard: boolean;
  /** This run's cart was copied from someone else's link. */
  stoleHaul: boolean;
  /** A shared haul this run is trying to beat, if any. */
  challenge: Challenge | null;

  // Meta-progression and preferences. These survive `reset()` — they belong to
  // the player, not to the run.
  soundEnabled: boolean;
  compactBalance: boolean;
  nickname: string;
  unlockedAchievements: string[];
  xp: number;
  dailyCompletedDate: string | null;
  dailyStreak: number;

  selectBillionaire: (id: string, netWorth?: number) => void;
  addItem: (productId: string, quantity?: number) => MutationResult;
  removeItem: (productId: string, quantity?: number) => MutationResult;
  setQuantity: (productId: string, quantity: number) => MutationResult;
  clearCart: () => void;
  placeOrder: () => Order | null;
  reset: () => void;
  /** Copies a shared haul into a fresh run. Quantities are re-clamped to today's prices. */
  stealHaul: (haul: Haul) => { applied: number; dropped: number };
  /** Starts a fresh run against a shared haul's score. */
  startChallenge: (haul: Haul, code: string) => void;
  clearChallenge: () => void;
  /** Records newly-unlocked achievements and awards XP. Returns only the new ones. */
  unlockAchievements: (ids: string[]) => string[];
  setNickname: (nickname: string) => void;
  completeDaily: (dateKey: string, xp: number) => boolean;
  markMilestone: (milestone: number) => void;
  markDestroyedSeen: () => void;
  markSavedToLeaderboard: () => void;
  toggleSound: () => void;
  toggleCompactBalance: () => void;
}

const initialSession = {
  billionaireId: null,
  startingBalance: 0,
  cart: {} as CartMap,
  purchased: {} as CartMap,
  orders: [] as Order[],
  lastOrderNumber: null,
  startedAt: null,
  halfwayAt: null,
  milestonesHit: [] as number[],
  destroyedSeen: false,
  savedToLeaderboard: false,
  stoleHaul: false,
  challenge: null as Challenge | null,
};

// ---------------------------------------------------------------- pure math

export function valueOf(map: CartMap): number {
  let total = 0;
  for (const [productId, quantity] of Object.entries(map)) {
    const product = PRODUCTS_BY_ID[productId];
    if (!product) continue;
    total += product.price * quantity;
  }
  return total;
}

export function countOf(map: CartMap): number {
  let count = 0;
  for (const quantity of Object.values(map)) count += quantity;
  return count;
}

/** Sums two quantity maps. Used to merge a cart into `purchased` at checkout. */
export function mergeMaps(a: CartMap, b: CartMap): CartMap {
  const out: CartMap = { ...a };
  for (const [id, qty] of Object.entries(b)) out[id] = (out[id] ?? 0) + qty;
  return out;
}

export function computeTotalSpent(state: {
  cart: CartMap;
  purchased: CartMap;
}): number {
  return valueOf(state.purchased) + valueOf(state.cart);
}

export function computeItems(map: CartMap): CartItem[] {
  return Object.entries(map)
    .flatMap(([productId, quantity]) => {
      const product = PRODUCTS_BY_ID[productId];
      if (!product || quantity <= 0) return [];
      return [{ product, quantity, lineTotal: product.price * quantity }];
    })
    .sort((a, b) => b.lineTotal - a.lineTotal);
}

export function computePercentSpent(spent: number, starting: number): number {
  if (starting <= 0) return 0;
  return (spent / starting) * 100;
}

/** How many more of `price` the wallet can cover. */
export function maxAffordableUnits(remaining: number, price: number): number {
  if (price <= 0) return 0;
  return Math.floor(remaining / price);
}

// ------------------------------------------------------------------- store

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => {
      /** Applies a new cart and advances the halfway timer if this crossed 50%. */
      const commitCart = (cart: CartMap) => {
        const state = get();
        const patch: Partial<GameState> = { cart };
        if (state.halfwayAt === null && state.startingBalance > 0) {
          const spent = valueOf(state.purchased) + valueOf(cart);
          if (spent * 2 >= state.startingBalance) {
            patch.halfwayAt = Date.now();
          }
        }
        set(patch);
      };

      return {
        ...initialSession,
        soundEnabled: true,
        compactBalance: false,
        nickname: "",
        unlockedAchievements: [],
        xp: 0,
        dailyCompletedDate: null,
        dailyStreak: 0,

        selectBillionaire: (id, netWorth) => {
          const billionaire = getBillionaire(id);
          if (!billionaire) return;
          set({
            ...initialSession,
            billionaireId: id,
            startingBalance: netWorth ?? billionaire.netWorth,
            startedAt: Date.now(),
          });
        },

        addItem: (productId, quantity = 1) => {
          const state = get();
          const product = PRODUCTS_BY_ID[productId];
          const inCart = state.cart[productId] ?? 0;
          if (!product || quantity <= 0) {
            return { ...NO_OP, requested: quantity, finalQuantity: inCart };
          }

          const remaining = state.startingBalance - computeTotalSpent(state);
          const maxAffordable = maxAffordableUnits(remaining, product.price);
          const applied = Math.min(quantity, maxAffordable);

          if (applied <= 0) {
            return {
              applied: 0,
              requested: quantity,
              clamped: true,
              maxAffordable: 0,
              finalQuantity: inCart,
            };
          }

          commitCart({ ...state.cart, [productId]: inCart + applied });

          return {
            applied,
            requested: quantity,
            clamped: applied < quantity,
            maxAffordable,
            finalQuantity: inCart + applied,
          };
        },

        /** Only ever removes from the cart. Checked-out items are non-refundable. */
        removeItem: (productId, quantity = 1) => {
          const state = get();
          const inCart = state.cart[productId] ?? 0;
          if (inCart <= 0 || quantity <= 0) {
            return { ...NO_OP, requested: quantity, finalQuantity: inCart };
          }

          const applied = Math.min(quantity, inCart);
          const next = { ...state.cart };
          if (inCart - applied <= 0) delete next[productId];
          else next[productId] = inCart - applied;

          commitCart(next);

          return {
            applied,
            requested: quantity,
            clamped: applied < quantity,
            maxAffordable: 0,
            finalQuantity: inCart - applied,
          };
        },

        setQuantity: (productId, quantity) => {
          const state = get();
          const product = PRODUCTS_BY_ID[productId];
          const inCart = state.cart[productId] ?? 0;
          const target = Math.max(0, Math.floor(quantity));
          if (!product) return { ...NO_OP, finalQuantity: inCart };

          if (target === inCart) {
            return { ...NO_OP, requested: target, finalQuantity: inCart };
          }
          if (target < inCart) return get().removeItem(productId, inCart - target);
          return get().addItem(productId, target - inCart);
        },

        clearCart: () => commitCart({}),

        /**
         * Moves the cart into `purchased`. The balance does NOT change here —
         * every dollar was already reserved when the item was added.
         */
        placeOrder: () => {
          const state = get();
          const items = { ...state.cart };
          const total = valueOf(items);
          if (total <= 0 || Object.keys(items).length === 0) return null;

          const order: Order = {
            number: state.orders.length + 1,
            items,
            total,
            placedAt: Date.now(),
          };

          set({
            orders: [...state.orders, order],
            purchased: mergeMaps(state.purchased, items),
            cart: {},
            lastOrderNumber: order.number,
          });

          return order;
        },

        /** Wipes the run. Achievements, XP, streak, and nickname belong to the player. */
        reset: () => set({ ...initialSession }),

        stealHaul: (haul) => {
          const billionaire = getBillionaire(haul.billionaireId);
          if (!billionaire) return { applied: 0, dropped: 0 };

          // Start the run from scratch, then re-buy each line against today's
          // prices. A price rise since the link was made can make the haul
          // unaffordable, so every line goes through the same clamp as a click.
          set({
            ...initialSession,
            billionaireId: haul.billionaireId,
            startingBalance: haul.startingBalance,
            startedAt: Date.now(),
            stoleHaul: true,
          });

          let applied = 0;
          let dropped = 0;
          // Most expensive first, so a shortfall drops the cheap tail, not the point of the haul.
          const lines = Object.entries(haul.items).sort(
            ([a], [b]) => (PRODUCTS_BY_ID[b]?.price ?? 0) - (PRODUCTS_BY_ID[a]?.price ?? 0),
          );
          for (const [productId, quantity] of lines) {
            const result = get().addItem(productId, quantity);
            applied += result.applied;
            dropped += quantity - result.applied;
          }

          return { applied, dropped };
        },

        startChallenge: (haul, code) => {
          const billionaire = getBillionaire(haul.billionaireId);
          if (!billionaire) return;
          set({
            ...initialSession,
            billionaireId: haul.billionaireId,
            startingBalance: haul.startingBalance,
            startedAt: Date.now(),
            challenge: {
              nickname: haul.nickname || "someone",
              billionaireId: haul.billionaireId,
              targetSpent: haul.spent,
              targetPercent: computePercentSpent(haul.spent, haul.startingBalance),
              code,
            },
          });
        },

        clearChallenge: () => set({ challenge: null }),

        unlockAchievements: (ids) => {
          const state = get();
          const fresh = ids.filter((id) => !state.unlockedAchievements.includes(id));
          if (fresh.length === 0) return [];

          const gained = fresh.reduce(
            (sum, id) => sum + (ACHIEVEMENT_XP[id] ?? 0),
            0,
          );
          set({
            unlockedAchievements: [...state.unlockedAchievements, ...fresh],
            xp: state.xp + gained,
          });
          return fresh;
        },

        setNickname: (nickname) => set({ nickname: nickname.slice(0, 20) }),

        /** Returns true if this call is what completed today's challenge. */
        completeDaily: (dateKey, xp) => {
          const state = get();
          if (state.dailyCompletedDate === dateKey) return false;

          const streak =
            state.dailyCompletedDate &&
            isConsecutiveDay(state.dailyCompletedDate, dateKey)
              ? state.dailyStreak + 1
              : 1;

          set({ dailyCompletedDate: dateKey, dailyStreak: streak, xp: state.xp + xp });
          return true;
        },

        markMilestone: (milestone) => {
          const { milestonesHit } = get();
          if (milestonesHit.includes(milestone)) return;
          set({ milestonesHit: [...milestonesHit, milestone] });
        },

        markDestroyedSeen: () => set({ destroyedSeen: true }),
        markSavedToLeaderboard: () => set({ savedToLeaderboard: true }),

        toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
        toggleCompactBalance: () =>
          set({ compactBalance: !get().compactBalance }),
      };
    },
    {
      name: "slab:game",
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const old = persisted as Partial<GameState>;
        // v1 had a single `cart` and no checkout. Treat those as un-ordered.
        const withOrders =
          version < 2
            ? { ...old, purchased: {}, orders: [], lastOrderNumber: null }
            : old;
        // v2 had no meta-progression.
        const withMeta =
          version < 3
            ? {
                ...withOrders,
                stoleHaul: false,
                challenge: null,
                nickname: "",
                unlockedAchievements: [],
                xp: 0,
                dailyCompletedDate: null,
                dailyStreak: 0,
              }
            : withOrders;
        return withMeta as GameState;
      },
      partialize: (state) => ({
        billionaireId: state.billionaireId,
        startingBalance: state.startingBalance,
        cart: state.cart,
        purchased: state.purchased,
        orders: state.orders,
        lastOrderNumber: state.lastOrderNumber,
        startedAt: state.startedAt,
        halfwayAt: state.halfwayAt,
        milestonesHit: state.milestonesHit,
        destroyedSeen: state.destroyedSeen,
        savedToLeaderboard: state.savedToLeaderboard,
        stoleHaul: state.stoleHaul,
        challenge: state.challenge,
        soundEnabled: state.soundEnabled,
        compactBalance: state.compactBalance,
        nickname: state.nickname,
        unlockedAchievements: state.unlockedAchievements,
        xp: state.xp,
        dailyCompletedDate: state.dailyCompletedDate,
        dailyStreak: state.dailyStreak,
      }),
    },
  ),
);

// --------------------------------------------------------------- selectors
// All of these return scalars (or a stable state reference), so they're safe to
// use directly with useSyncExternalStore — no shallow comparison needed.

export const useBillionaireId = () => useGameStore((s) => s.billionaireId);
export const useStartingBalance = () => useGameStore((s) => s.startingBalance);
export const useCart = () => useGameStore((s) => s.cart);
export const usePurchased = () => useGameStore((s) => s.purchased);
export const useOrders = () => useGameStore((s) => s.orders);

export const useBillionaire = (): Billionaire | null =>
  useGameStore((s) => getBillionaire(s.billionaireId));

export const useTotalSpent = () => useGameStore(computeTotalSpent);

export const useCartTotal = () => useGameStore((s) => valueOf(s.cart));
export const useCartCount = () => useGameStore((s) => countOf(s.cart));
export const useCartLines = () => useGameStore((s) => Object.keys(s.cart).length);

export const useRemainingBalance = () =>
  useGameStore((s) => s.startingBalance - computeTotalSpent(s));

export const usePercentSpent = () =>
  useGameStore((s) => computePercentSpent(computeTotalSpent(s), s.startingBalance));

export const useItemsBought = () =>
  useGameStore((s) => countOf(s.cart) + countOf(s.purchased));

/** Quantity currently in the cart (not yet ordered). */
export const useQuantity = (productId: string) =>
  useGameStore((s) => s.cart[productId] ?? 0);

/** Quantity already checked out. */
export const useOwned = (productId: string) =>
  useGameStore((s) => s.purchased[productId] ?? 0);

/** True once nothing on the shelf is affordable — the fortune is effectively gone. */
export const useIsFortuneDestroyed = () =>
  useGameStore(
    (s) =>
      s.billionaireId !== null &&
      s.startingBalance - computeTotalSpent(s) < CHEAPEST_PRICE,
  );

export const useHasPurchases = () =>
  useGameStore(
    (s) => Object.keys(s.cart).length > 0 || Object.keys(s.purchased).length > 0,
  );

export const useLastOrder = (): Order | null =>
  useGameStore((s) => s.orders[s.orders.length - 1] ?? null);

export const useSoundEnabled = () => useGameStore((s) => s.soundEnabled);
export const useCompactBalance = () => useGameStore((s) => s.compactBalance);

export const useChallenge = () => useGameStore((s) => s.challenge);
export const useNickname = () => useGameStore((s) => s.nickname);
export const useXp = () => useGameStore((s) => s.xp);
export const useUnlocked = () => useGameStore((s) => s.unlockedAchievements);
export const useDailyStreak = () => useGameStore((s) => s.dailyStreak);
export const useDailyCompletedDate = () =>
  useGameStore((s) => s.dailyCompletedDate);

/** True once this run has out-spent the shared haul it was launched against. */
export const useBeatChallenge = () =>
  useGameStore((s) => {
    if (!s.challenge) return false;
    return computeTotalSpent(s) > s.challenge.targetSpent;
  });

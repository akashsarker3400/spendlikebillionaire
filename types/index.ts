export type CategoryId =
  | "everyday"
  | "cars"
  | "realestate"
  | "aviation"
  | "marine"
  | "absurd";

export interface Category {
  id: CategoryId;
  label: string;
}

export interface Billionaire {
  id: string;
  name: string;
  title: string;
  /** Whole US dollars. Never a float. */
  netWorth: number;
  initials: string;
  /** [from, to] hex pair for the generated avatar gradient, shown while the photo loads. */
  accent: [string, string];
  /** Path under /public. Absent for the fictional "Broke Mode" entry. */
  photo?: string;
  /** Name as it appears in the Forbes real-time list. Omit to skip live lookup. */
  forbesName?: string;
  /** Comedy option that shouldn't be treated as a real billionaire. */
  joke?: boolean;
}

/**
 * Where a price came from. Shown on the card so nobody mistakes a guess for a
 * quote — a Birkin's $13,500 is what Hermès charges, an NFL team's $7.1B is an
 * analyst's valuation, and a Mars colony's price is a number we made up.
 */
export type PriceBasis = "msrp" | "avg" | "estimate";

export interface Product {
  id: string;
  name: string;
  /** Fallback for products that aren't photographable (a space program, a vaccine rollout). */
  emoji: string;
  /** Path under /public. Absent means the card renders `emoji` instead. */
  photo?: string;
  /** Whole US dollars. Never a float. */
  price: number;
  priceBasis: PriceBasis;
  category: CategoryId;
  description: string;
}

/** Attribution for a Wikimedia Commons image. Required by CC BY / CC BY-SA. */
export interface ImageCredit {
  /** Billionaire id or product id. */
  id: string;
  /** What the image depicts, for the credits page. */
  subject: string;
  file: string;
  license: string;
  author: string;
  /** Commons file description page. */
  source: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  /** price * quantity, in whole dollars. */
  lineTotal: number;
}

/**
 * A cart that has been checked out. Funds were already reserved when the items
 * were added, so placing an order moves them from `cart` to `purchased` without
 * touching the balance. There are no refunds after checkout — the receipt says so.
 */
export interface Order {
  number: number;
  /** productId -> quantity, snapshotted at checkout. */
  items: Record<string, number>;
  /** Whole US dollars. */
  total: number;
  placedAt: number;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  billionaireId: string;
  billionaireName: string;
  startingBalance: number;
  totalSpent: number;
  percentSpent: number;
  itemsBought: number;
  uniqueItems: number;
  /** Milliseconds from session start to spending 50% of the fortune. */
  timeToHalfMs: number | null;
  createdAt: number;
}

export interface NetWorthResponse {
  source: "live" | "static";
  lastUpdated: string;
  /** Map of billionaire id -> whole dollars. */
  values: Record<string, number>;
}

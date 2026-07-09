"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, PRODUCTS } from "@/data/products";
import { cn } from "@/lib/utils";
import type { CategoryId } from "@/types";

type Filter = CategoryId | "all";
type Sort = "default" | "asc" | "desc";

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: "default", label: "Featured" },
  { id: "asc", label: "Price: low to high" },
  { id: "desc", label: "Price: high to low" },
];

export function ProductGrid() {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("default");
  const [query, setQuery] = useState("");

  // Typing shouldn't be blocked by re-rendering fifty-odd cards.
  const deferredQuery = useDeferredValue(query);

  const products = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    const filtered = PRODUCTS.filter((p) => {
      if (filter !== "all" && p.category !== filter) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle)
      );
    });

    if (sort === "asc") return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === "desc") return [...filtered].sort((a, b) => b.price - a.price);
    return filtered;
  }, [filter, sort, deferredQuery]);

  return (
    <section>
      <div className="py-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Search products</span>
              <SearchIcon />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${PRODUCTS.length} things to buy…`}
                className="surface h-10 w-full rounded-lg pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-subtle focus:border-accent"
              />
            </label>

            <label className="relative shrink-0">
              <span className="sr-only">Sort by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="surface h-10 cursor-pointer appearance-none rounded-lg pl-3 pr-8 text-sm outline-none transition-colors focus:border-accent"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronIcon />
            </label>
          </div>

          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-0.5 sm:-mx-8 sm:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterTab
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label="All"
            />
            {CATEGORIES.map((c) => (
              <FilterTab
                key={c.id}
                active={filter === c.id}
                onClick={() => setFilter(c.id)}
                label={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="py-20 text-center text-sm text-subtle">
          Nothing matches “{query.trim()}”. Even billionaires have limits.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

function FilterTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-ink"
          : "border-line text-subtle hover:text-ink dark:hover:text-white",
      )}
    >
      {label}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

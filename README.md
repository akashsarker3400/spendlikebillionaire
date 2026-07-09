# Spend Like a Billionaire

A satirical ecommerce simulation. Pick one of the world's richest people, receive their entire net worth as a wallet balance, and buy jets, islands, and sports teams until it's gone.

**Pick a billionaire → get their net worth → add to cart → check out → share the link → someone steals your haul.**

## Setup

Requires Node 18.17+ (developed and verified on Node 24 LTS).

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
pnpm build      # production build
pnpm start      # serve the production build
pnpm typecheck  # tsc --noEmit
pnpm lint       # next lint
```

## Deploying

There is no backend and no database — everything lives in the browser. But the app is **not** a static export: `app/h/[code]/opengraph-image.tsx` runs on the edge runtime to render share cards, so it needs a real Node/Vercel server (`next build && next start`).

Deploys to Vercel with zero configuration.

**Coolify / Dokku / any Docker host:** use the committed `Dockerfile`, not Nixpacks. In Coolify, set **Build Pack = Dockerfile** and expose port **3000**.

Nixpacks technically works, but it builds a ~2.5 GB image (Ubuntu base + a full Nix store + the whole 332 MB `node_modules`), which exhausts the disk on a small server while exporting layers. The `Dockerfile` uses Next's `output: "standalone"` — only the traced modules ship, so `node_modules` drops from 332 MB to 25 MB and the runtime image is roughly a tenth the size.

Two things that will silently break a standalone image:

- **`public/` and `.next/static` are not included in `.next/standalone`.** The Dockerfile copies them explicitly. Miss either and the app boots fine with no CSS and no images.
- **The entrypoint is `node server.js`, not `next start`.** The standalone bundle has no `next` binary. `HOSTNAME=0.0.0.0` is required or the container is unreachable despite the process running.

The package manager is pnpm, pinned by `packageManager` in `package.json` and locked by `pnpm-lock.yaml`. Both must be committed and must agree. **Do not commit a `package-lock.json` alongside it** — Nixpacks reads the `packageManager` field and then fails with `ERR_PNPM_NO_LOCKFILE`.

## Features

**Pick a fortune.** Fourteen options, from Elon Musk down to "You (Broke Mode)" at $1,000, each with a freely-licensed portrait. The grid ranks by whatever net worth is actually on screen, so live figures reorder it correctly. Selecting one plays a wallet-loading animation that counts up from $0.

**Shop.** 63 products across six categories — Everyday, Cars, Real Estate, Aviation, Marine, and Absurd — 45 of them photographed. Add any quantity of anything: hit **Add to cart**, then use the stepper — tap `+`, hold it to repeat at an accelerating rate, or tap the number to type an exact quantity. Filter by category, sort by price, search by name.

**Cart and checkout.** A mini-cart drawer slides out of the header with a live badge, and `/cart` gives you a full page with line items, steppers, and remove. `/checkout` reviews the order (shipping free, tax LOL) and **Place order** confirms it. Orders accumulate: keep shopping and place as many as the fortune allows.

**Watch it drain.** A sticky balance bar shows the remaining balance as an animated ticker (tap it to switch between `$399,400,000,000` and `$399.4B`), total spent, and a progress bar that shifts gray → blue → orange → red as the fortune burns.

**Celebrate.** Confetti and a toast at 25%, 50%, and 75%. A full-screen **Fortune Destroyed** state once nothing on the shelf is affordable any more.

**Get a receipt.** Placing an order lands on `/order`, a confirmation with a thermal-paper receipt: order number, every line item, the order total, the run total, the damage as a percentage, and an auto-generated headline. Export it as a PNG — one tap shares it via the native share sheet on mobile, or downloads it on desktop.

**See what the money means.** A stats drawer converts your spending into people fed for a year, years of an average US salary, years of minimum-wage labour, and — if you bought Lamborghinis — how far they'd stretch bumper to bumper.

**Compete with yourself.** A local leaderboard ranks your top 10 runs three ways: most spent, most items, and fastest to burn half the fortune.

**Share it, and make it a game.** Every run compresses into a link — `/h/<code>` — that carries the whole receipt. Paste it into WhatsApp, Facebook, or X and it unfurls as a generated card with the billionaire's portrait, the amount, and the top items. Whoever opens it can **Steal this haul** (their exact cart, re-priced to today) or **Beat them** (same fortune, their score as a target, a progress bar chasing it).

**A share studio.** After checkout, pick a look and post the image: three templates (**Poster**, **Clean**, **Receipt**) × three formats (**Square** 1080×1080 for a feed, **Story** 1080×1920 for a status, **Wide** 1200×630 for a link). Live preview, exported at full resolution via `html-to-image`.

**Achievements, XP, and levels.** 26 achievements from *First Blood* to *Buy The Catalogue*, three of them secret. XP levels you from Window Shopper to Fortune Destroyer.

**A daily challenge.** One per UTC day, derived from the date so every player in the world gets the same one, with a local streak counter.

Plus: dark mode, a mute toggle, full `prefers-reduced-motion` support, an app-like bottom tab bar on mobile, and safe-area insets.

## Architecture

```
app/
  page.tsx              landing — billionaire grid, wallet-loading transition
  shop/page.tsx         balance bar, product grid, cart drawer
  cart/page.tsx         full cart — line items, steppers, remove
  checkout/page.tsx     order review, Place order
  order/page.tsx        confirmation, receipt, share sheet, leaderboard save
  receipt/page.tsx      redirect to /order (old links)
  h/[code]/page.tsx     a shared haul — steal it or beat it
  h/[code]/opengraph-image.tsx   the card social apps unfurl (edge runtime)
  achievements/page.tsx XP, levels, achievement grid
  leaderboard/page.tsx  local rankings
  credits/page.tsx      image attribution (required by CC BY / CC BY-SA)
  api/networth/route.ts live net worth, with a static fallback
components/             UI and feature components
lib/                    store, formatting, sounds, confetti, leaderboard, stats
data/                   billionaires.ts, products.ts, headlines.ts, credits.ts (generated)
public/people/          13 portraits    (~300 KB)
public/products/        45 product shots (~2 MB)
types/                  Billionaire, Product, CartItem, LeaderboardEntry, ImageCredit
```

### Money is always an integer

Every price is a whole US dollar amount held in a plain JS number. Quantities are integers. The affordability clamp in `lib/store.ts` guarantees `totalSpent <= startingBalance`, and the largest starting balance is ~$930B, so every intermediate value stays far below `Number.MAX_SAFE_INTEGER`. **Never introduce a float price**, and never divide money without `Math.floor`.

That clamp is also what keeps "1,000,000 Big Macs" from breaking anything: you can only ever buy what the wallet covers, so the arithmetic can't run away.

### Funds are reserved on add, not charged at checkout

This is the single rule in `lib/store.ts` that is easy to get wrong and invisible in the UI:

```
totalSpent = value(purchased) + value(cart)
remaining  = startingBalance - totalSpent
```

The balance drops the moment an item enters the cart. `placeOrder()` therefore only **moves** quantities from `cart` into `purchased` — it must never touch the balance again, or the player is charged twice. The suite asserts `totalSpent` is byte-for-byte identical before and after checkout.

Two consequences worth knowing. Removing from the cart refunds the reserve; removing after checkout does not, which is why `removeItem` only ever touches `cart` and the receipt says *no refunds*. And the UI must never say "balance after checkout" — that number is already the balance.

### Live net worth

`GET /api/networth` reads the Forbes real-time billionaires list and matches people by normalised name. If the fetch fails, times out, or matches nobody, it returns the hardcoded values from `data/billionaires.ts` with a `200`. **The route never returns an error**, and the landing page renders static values immediately regardless, then merges live ones in if they arrive.

Three things about that endpoint, each of which cost a debugging session:

- **It answers `503` to anything without a browser `User-Agent`.** Because the fallback is silent by design, this looks like nothing is wrong — the site just quietly shows January's numbers forever. Check `source` in the response: `"live"` or `"static"`.
- **The unfiltered payload is 42 MB.** `?fields=personName,finalWorth` trims it to ~184 KB.
- **The route must be `dynamic = "force-dynamic"`.** It used to be statically generated with `revalidate = 86400`, which baked whatever Forbes returned *at docker build time* into the image. One `503` during the build served stale data to every visitor for 24 hours.

Successful responses are cached in memory for 6 hours. **Failures are never cached** and are sent with `no-store`, so one bad minute at Forbes can't poison the next six hours. Set `NETWORTH_SOURCE_URL` to a dead URL to exercise the fallback path.

Because live figures reshuffle the ranking (Larry Page currently outranks Bezos, which the static list doesn't reflect), the landing grid sorts on whatever values it's actually displaying rather than on array order.

To refresh the fallback numbers, edit `data/billionaires.ts` and bump `NET_WORTH_LAST_UPDATED` — it's shown in the footer.

### State

Zustand with the `persist` middleware, keyed to `slab:game` in `localStorage`. Because persisted state rehydrates after the first paint, anything that reads it is gated behind `useMounted()` — otherwise the server HTML and the first client render disagree and React throws a hydration error.

`startingBalance` is snapshotted when you pick a billionaire, so a live net-worth update can never shift a run that's already in progress.

### The whole receipt lives in the URL

There is no server and no database, yet one player's run reaches another's phone. `lib/haul.ts` packs a run into a base36 + base64url string:

```
1~<billionaireId>~<startingBalance36>~<id*qty36.id*qty36>~<spent36>~<nick64>~<ts36>
```

A 21-item, $924B haul is **104 characters**. A Bengali-plus-emoji nickname survives the round trip. `decodeHaul` returns `null` for anything malformed, unknown, or implausible — it never throws, and a truncated link lands on a friendly "that link is broken" page rather than a crash.

Two rules. `spent` is *stored*, not recomputed, so a shared receipt keeps showing the number its author saw even after a price update. But `stealHaul` re-buys every line through the normal affordability clamp at *today's* prices, so a price rise drops the cheap tail rather than letting the cart exceed the fortune.

### Share images: two renderers, two sets of rules

There are two completely different image pipelines, and code cannot be shared between them.

**`components/ShareImage.tsx`** runs in the browser and is rasterised by `html-to-image`. It uses inline styles with literal colours and a system font stack — no Tailwind classes, no CSS variables, no webfont. html-to-image clones the node into a detached document where `var(--line)` resolves to nothing and an unloaded webfont silently becomes Times New Roman. One `u = width / 1080` scale unit drives every dimension, so each template is written once and works at all three formats.

**`app/h/[code]/opengraph-image.tsx`** runs on the edge and is rasterised by Satori.

### The OG card has three hard constraints

`app/h/[code]/opengraph-image.tsx` runs on the edge and is rendered by Satori, which is not a browser:

1. **Any `<div>` with more than one child needs an explicit `display: flex`.** Interpolating two text nodes into one div counts, and it fails at request time with a 500, not at build time. Every text node in that file is a single precomputed string.
2. **Emoji require a font fetched over the network at render time.** Products without a photo get a deterministic coloured tile with an initial, never an emoji.
3. **No filesystem and no `<img src="/foo.jpg">`.** Portraits and product shots are inlined as data URIs in `data/imageThumbs.ts` (~290 KB of 96–112px JPEGs), generated at build time. Satori also cannot parse `hsl()` inside a gradient — it throws at request time — so those tiles compute hex.

### Swapping the leaderboard for a real backend

All reads and writes go through the `LeaderboardProvider` interface in `lib/leaderboard.ts`. The methods are already `async` even though `localStorage` isn't. To move to Supabase, write a second class implementing the same interface and change the one `export const leaderboard = ...` line. No calling code changes.

### Sound

Sounds are synthesised with the Web Audio API rather than shipped as audio files — nothing to download, nothing to 404. The `AudioContext` is only constructed on the first real user gesture, because browsers block it before that. Muting is persisted.

### Three constraints that are easy to break

**Never give a server-rendered element a Framer `initial` that hides it.** `<motion.div initial={{opacity: 0}}>` serialises to `style="opacity:0"` in the SSR HTML, so the page ships invisible and depends on JS to reveal it. Disable JavaScript, block one chunk, or throw during hydration, and the site is a blank white screen forever. Page and card entrances are therefore CSS keyframes (`animate-fade-in`, `animate-fade-up`) that animate *from* opacity 0 with **no fill-mode**, leaving the resting state visible. A browser that never runs the animation still paints the page. `pnpm build` then `grep opacity:0 .next/server/app/index.html` should always come back empty.

**Never branch the render tree on `useReducedMotion()`.** The server can't know the user's preference, so a component that returns a different tree (or even a different initial `style`) under reduced motion will fail hydration for exactly those users. `app/template.tsx` handles this with `<MotionConfig reducedMotion="user">`, which strips transforms for descendants without changing what the server emits.

**The quantity stepper needs both `pointerdown` and `click`.** Hold-to-repeat requires `pointerdown`, but macOS Voice Control and other assistive tech dispatch a bare `click` with no pointer events. `StepButton` handles both and uses a ref so a real mouse press doesn't count twice.

**Theme-dependent colours must be CSS variables, not literals.** `line` and `canvas` in `tailwind.config.ts` resolve to `var(--line)` / `var(--bg-muted)`. They were hardcoded hexes, which meant `bg-line` — used for every progress-bar track and skeleton — stayed light grey in dark mode, so a 0.1% progress bar read as a *full* bar. The catch: Tailwind can't fold an opacity modifier into a `var()`, so `bg-line/50` will silently do nothing. Nothing uses one; keep it that way.

### Meta-progression survives `reset()`

`reset()` wipes the run. It must **not** wipe `unlockedAchievements`, `xp`, `dailyStreak`, `dailyCompletedDate`, or `nickname` — those belong to the player, not the run, and live outside `initialSession` for exactly that reason. The persisted store is at `version: 3` with migrations from both earlier shapes.

Achievements are pure predicates over a snapshot (`data/achievements.ts`), so `ProgressWatcher` can re-evaluate all of them on every state change; `unlockAchievements` returns only the newly-unlocked ids and everything else is a no-op.

## Images and attribution

Every photograph — 13 portraits and 45 product shots — comes from Wikimedia Commons under a licence that permits reuse (CC BY, CC BY-SA, CC0, or public domain). **This carries an obligation**: `/credits` lists each image with its author, licence, and a link to its Commons file page, and the landing footer links there. Images licensed CC BY-SA remain CC BY-SA. Do not add an image without adding its credit.

`data/credits.ts` is **generated** from the Commons API, not hand-written, so attribution can't drift from what was actually downloaded. Re-run the fetch scripts if you change the image set.

The 18 products that aren't photographable — a private space program, clean water for a nation, an NFL franchise — fall back to an emoji tile. `Product.photo` is optional and `ProductCard` branches on it.

"Broke Mode" is the one entry with no photo, because he isn't real. He keeps the generated initials avatar, which is why `Avatar` still contains both renderers.

## Prices

Researched July 2026. `Product.priceBasis` records how much to trust each number, and the card shows it:

- **MSRP** — the manufacturer's list price. A Birkin 25 is $13,500 at Hermès, not the ~$30k it fetches on the resale market. A Daytona is $16,900 at list, which is not a price you will be offered.
- **avg.** — a published average or a real reported transaction. Franchise values are league averages (Forbes/Sportico), not the price of any specific club. Twitter's $44B is what Musk actually paid in 2022.
- **est.** — we made it up, or it's an analyst's guess. Private islands, Mars colonies, and the Mona Lisa.

Prices are integers, and the affordability clamp still guarantees `totalSpent <= startingBalance`.

## Notes

Next is pinned to the latest 14.x (`14.2.35`). `npm audit` still reports advisories against Next 14 that are only cleared by upgrading to 16, which would break the App Router 14 requirement. They all concern self-hosted server surfaces this app doesn't use: the `next/image` optimizer (no `next/image` here), middleware and rewrites (none), and RSC streaming (every route is static).

Net worth figures are estimates, prices are approximations, and nothing here is for sale. This project is not affiliated with anyone it names.

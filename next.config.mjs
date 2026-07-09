/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Emits `.next/standalone/server.js` with only the node_modules actually
   * traced as reachable. A Nixpacks image ships the whole 332 MB dependency
   * tree plus a Nix store; this produces a runtime image an order of magnitude
   * smaller, which is the difference between deploying and filling the disk.
   *
   * The catch: `public/` and `.next/static` are NOT copied into standalone.
   * The Dockerfile has to do it, or you get a running server with no CSS and
   * no images. See Dockerfile.
   */
  output: "standalone",

  /**
   * The three settings below exist to make `next build` survive a 1 vCPU / 4 GB
   * VPS, where the kernel OOM-killer silently kills it (exit 255, no error).
   *
   * ESLint and tsc each fork their own process during `next build` and together
   * cost more memory than the webpack compile itself. They are not skipped —
   * they are moved. `pnpm lint` and `pnpm typecheck` still run locally and in
   * CI, which is where a type error should stop you, not in a production image
   * build that has already been proven green.
   */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  experimental: {
    // Static generation spawns one worker per CPU. On a single-core box the
    // extra workers buy nothing and each holds its own Next runtime in memory.
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;

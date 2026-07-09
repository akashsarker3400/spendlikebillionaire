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
};

export default nextConfig;

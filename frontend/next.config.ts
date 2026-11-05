import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the browser-test build separate from a running development server.
  distDir: process.env.PLAYWRIGHT_TEST === "1" ? ".next-playwright" : ".next",
  agentRules: false,
  async rewrites() {
    const backend = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");
    return [{ source: "/api/menu-snapshots", destination: `${backend}/api/menu-snapshots` }];
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

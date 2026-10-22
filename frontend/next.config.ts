import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the browser-test build separate from a running development server.
  distDir: process.env.PLAYWRIGHT_TEST === "1" ? ".next-playwright" : ".next",
  agentRules: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

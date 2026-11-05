import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the browser-test build separate from a running development server.
  distDir: process.env.PLAYWRIGHT_TEST === "1" ? ".next-playwright" : ".next",
  agentRules: false,
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://127.0.0.1:3001";
    // /api/users/:path* is the profile-edit family (PUT/DELETE allergies and
    // favorite foods); without it those calls 404 against Next's own router.
    return ["/api/auth/:path*", "/api/authenticate", "/api/users", "/api/users/:path*", "/api/menus"].map(source => ({ source, destination: `${backend}${source}` }));
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

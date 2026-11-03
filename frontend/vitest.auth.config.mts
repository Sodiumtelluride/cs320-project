import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/auth/**/*.test.ts"],
    restoreMocks: true,
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "client/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
});

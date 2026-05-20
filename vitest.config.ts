import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    exclude: ["**/node_modules/**", "**/tests/e2e/**"],
    env: {
      DATABASE_URL: "postgresql://localhost:5432/lms_test",
      BETTER_AUTH_SECRET: "test-better-auth-secret-not-for-production",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

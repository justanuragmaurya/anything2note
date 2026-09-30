import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./test/wrangler.jsonc" },
      // Applied by test/setup.ts; storage is isolated per test file.
      miniflare: { bindings: { TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, "drizzle")) } },
    })),
  ],
  test: { setupFiles: ["./test/setup.ts"] },
});

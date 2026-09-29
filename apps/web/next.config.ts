import type { NextConfig } from "next";

// Public R2 bucket `a2n-assets` holding site artwork under `art/`. Swap for a
// custom domain (e.g. assets.anything2note.com) once the domain is live.
const ASSETS_URL =
  process.env.NEXT_PUBLIC_ASSETS_URL ?? "https://pub-f1e7c938e81b469ba0864e7ea784cb9f.r2.dev";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

const nextConfig: NextConfig = {
  // TS-source workspace package with the API contract and note-type registry.
  transpilePackages: ["@a2n/shared"],
  env: {
    NEXT_PUBLIC_ASSETS_URL: ASSETS_URL,
    NEXT_PUBLIC_API_URL: API_URL,
  },
  images: {
    remotePatterns: [new URL(`${ASSETS_URL}/art/**`), new URL("https://i.ytimg.com/vi/**")],
  },
};

export default nextConfig;

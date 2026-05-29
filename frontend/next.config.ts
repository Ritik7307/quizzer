import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const API_TARGET = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  // Monorepo has lockfiles at repo root + frontend — pin app root so chunks don't break
  turbopack: {
    root: rootDir,
  },
  outputFileTracingRoot: path.join(rootDir, ".."),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

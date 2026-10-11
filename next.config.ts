import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: { "/*": ["./db/migrations/*.sql"] },
  outputFileTracingExcludes: {
    "/*": [
      "./.env*",
      "./.agent-memory/**/*",
      "./data/**/*",
      "./backups/**/*",
      "./test-results/**/*",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;

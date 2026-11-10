import type { NextConfig } from "next";
import crypto from "node:crypto";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Random per build. Signs bot-check cookies when no secret is configured, so every
  // instance of one deployment agrees. Only server code reads it.
  env: { IK_BUILD_SECRET: process.env.IK_BUILD_SECRET || crypto.randomBytes(32).toString("hex") },
  reactStrictMode: true,
  experimental: { globalNotFound: true },
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

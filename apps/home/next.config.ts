import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  async headers() {
    const development = process.env.NODE_ENV === "development";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' ${development ? "'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              `connect-src 'self' ${development ? "ws://localhost:* ws://127.0.0.1:*" : ""}`,
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};
export default config;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Don't advertise the framework via X-Powered-By.
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The app is never meant to be framed by another site.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // A strict Content-Security-Policy is deliberately not set here —
          // Clerk's auth flow and the glide-data-grid canvas editor both
          // need specific script/style/frame allowances, and getting that
          // wrong would break sign-in or the assessment/schedule grids
          // outright. Worth doing as a dedicated, tested follow-up rather
          // than alongside everything else in this pass.
        ],
      },
    ];
  },
};

export default nextConfig;

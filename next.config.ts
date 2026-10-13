import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // TypeScript 5 provides the compiler API. This avoids unreliable output
    // capture from Next's detached `tsc --showConfig` subprocess locally.
    useTypeScriptCli: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
    // Sanity CDN DNS can resolve to an IPv6-mapped private address locally.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;

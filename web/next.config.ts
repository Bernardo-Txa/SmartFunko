import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    unoptimized: true,
    qualities: [72, 75],
    remotePatterns: [
      {
        hostname: "cdn.awsli.com.br",
        protocol: "https",
      },
      {
        hostname: "m.media-amazon.com",
        protocol: "https",
      },
      {
        hostname: "b2b.clubecomix.com.br",
        protocol: "https",
      },
      {
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
        protocol: "https",
      },
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

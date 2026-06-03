import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "cdn.awsli.com.br",
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

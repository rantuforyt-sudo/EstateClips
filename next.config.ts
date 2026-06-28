import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel: increase body size limit for video uploads (handled via Supabase Storage directly)
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript build errors (optional)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable strict mode to prevent double rendering
  reactStrictMode: false,
};

export default nextConfig;

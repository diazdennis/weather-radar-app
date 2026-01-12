import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Disable strict mode to avoid double rendering in development
  reactStrictMode: true,

  // Allow images from external sources if needed
  images: {
    unoptimized: true,
  },

  // Experimental features
  experimental: {
    // Enable server actions if needed
  },
};

export default nextConfig;

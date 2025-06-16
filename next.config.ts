import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http", // For Firebase Storage Emulator
        hostname: "localhost",
        port: "9199", // Default port for Storage Emulator
        pathname: "/v0/b/**", // Allow all paths under the emulator's bucket structure
      },
      {
        protocol: "https", // For live Firebase Storage
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/v0/b/**",
      },
    ],
  },
};

export default nextConfig;

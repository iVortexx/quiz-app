
import type { NextConfig } from "next";

console.log("=============== LOADING next.config.ts (Attempting to set bodySizeLimit) ===============");

const nextConfig: NextConfig = {
  // Adding a global body parser size limit to see if it has any effect,
  // though serverActions.bodySizeLimit should be the primary one for Server Actions.
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Also set global API route body limit
    },
  },
  serverActions: {
    bodySizeLimit: 50 * 1024 * 1024, // 50MB as a number, explicit for Server Actions
    // You can also use a string like '50mb'
    // bodySizeLimit: '50mb',
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
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      }
    ],
  },
};

console.log("=============== next.config.ts SUCCESSFULLY PROCESSED (bodySizeLimit should be 50 * 1024 * 1024 and api.bodyParser.sizeLimit '50mb') ===============");

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  /*
  // ! Old way to set bodySizeLimit, not recommended in Next.js 13+ with Server Actions
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
  */
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
      },
    ],
  },
};

export default nextConfig;

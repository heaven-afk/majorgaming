import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets a phone on the same Wi-Fi load the dev server. Update if the laptop's IP changes.
  allowedDevOrigins: ["192.168.0.136", "192.168.1.136"],
  cacheComponents: true,
  partialPrefetching: true,
  // Admin uploads (posters, photos) go through Server Actions; images are capped at 10 MB.
  // Posters, logos and photos uploaded in the admin.
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

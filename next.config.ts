import type { NextConfig } from "next";
import { MGL_ORIGIN } from "./src/lib/site-url.mjs";

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      // Keep existing server integrations working while their stored URLs migrate.
      source: "/:path((?!api/|api$|\\.well-known/|_next/).*)",
      has: [{ type: "host" as const, value: "mglwebsite\\.vercel\\.app" }],
      destination: `${MGL_ORIGIN}/:path*`,
      permanent: true,
    }];
  },
  /* config options here */
  // Lets a phone on the same Wi-Fi load the dev server. Update if the laptop's IP changes.
  allowedDevOrigins: ["192.168.0.136", "192.168.1.136"],
  cacheComponents: true,
  partialPrefetching: true,
  // Posters, logos and photos uploaded in the admin.
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  // Images upload straight from the browser to Cloudinary; only spreadsheets (up to 4 MB) go
  // through Server Actions. Vercel refuses request bodies over 4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
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

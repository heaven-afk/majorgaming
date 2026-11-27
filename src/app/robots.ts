import type { MetadataRoute } from "next";
import { MGL_ORIGIN } from "@/lib/site-url.mjs";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: ["*", "OAI-SearchBot"],
      allow: "/",
      disallow: ["/admin", "/api/", "/fantasy/account", "/fantasy/squad", "/fantasy/login", "/fantasy/join", "/fantasy/forgot", "/fantasy/reset", "/fantasy/welcome"],
    },
    sitemap: `${MGL_ORIGIN}/sitemap.xml`,
  };
}

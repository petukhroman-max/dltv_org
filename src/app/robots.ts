import type { MetadataRoute } from "next";

import { absolutePublicUrl } from "@/lib/public-tournaments/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/tournaments", "/tournaments/"],
      disallow: [
        "/admin/",
        "/edit-submission/",
        "/workspace/",
        "/auth/",
        "/submit-tournament/success",
      ],
    },
    sitemap: absolutePublicUrl("/sitemap.xml"),
  };
}

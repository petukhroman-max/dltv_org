import type { MetadataRoute } from "next";

import { absolutePublicUrl } from "@/lib/public-tournaments/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/en", "/ru", "/en/tournaments", "/ru/tournaments"],
      disallow: [
        "/admin/",
        "/edit-submission/",
        "/workspace/",
        "/auth/",
        "/submit-tournament/success",
        "/en/admin/",
        "/ru/admin/",
        "/en/edit-submission/",
        "/ru/edit-submission/",
        "/en/workspace/",
        "/ru/workspace/",
        "/en/submit-tournament/success",
        "/ru/submit-tournament/success",
      ],
    },
    sitemap: absolutePublicUrl("/sitemap.xml"),
  };
}

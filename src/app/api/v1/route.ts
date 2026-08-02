import { randomUUID } from "node:crypto";

import { apiSuccess } from "@/lib/public-api/response";
import { handleApiOptions } from "@/lib/public-api/cors";
import type { NextRequest } from "next/server";

export async function OPTIONS(request: NextRequest) {
  return handleApiOptions(request);
}

export async function GET() {
  return apiSuccess(
    {
      name: "DLTV Public API",
      version: "v1",
      documentation_url: "https://deadlock.one/en/api-docs",
      attribution_required: true,
      server_timestamp: new Date().toISOString(),
    },
    randomUUID(),
  );
}

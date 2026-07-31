import "server-only";

import { z } from "zod";

import { publicEnvSchema } from "@/lib/env";

const adminEmailsSchema = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      : value,
  z.array(z.email()),
);

export const serverEnvSchema = publicEnvSchema
  .safeExtend({
    SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().min(1).optional(),
    ),
    ADMIN_EMAILS: adminEmailsSchema.default([]),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") {
      return;
    }

    if (!value.SUPABASE_SERVICE_ROLE_KEY) {
      context.addIssue({
        code: "custom",
        message: "SUPABASE_SERVICE_ROLE_KEY is required in production",
        path: ["SUPABASE_SERVICE_ROLE_KEY"],
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const serverEnv: ServerEnv = serverEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
});

export function requireSupabaseAdminEnv() {
  if (
    !serverEnv.NEXT_PUBLIC_SUPABASE_URL ||
    !serverEnv.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("Supabase admin environment is not configured");
  }

  return {
    url: serverEnv.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
  };
}

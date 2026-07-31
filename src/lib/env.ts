import { z } from "zod";

const optionalValue = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema.optional(),
  );

export const publicEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    NEXT_PUBLIC_APP_URL: optionalValue(z.url()),
    NEXT_PUBLIC_SUPABASE_URL: optionalValue(z.url()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalValue(z.string().min(1)),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") {
      return;
    }

    for (const key of [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ] as const) {
      if (!value[key]) {
        context.addIssue({
          code: "custom",
          message: `${key} is required in production`,
          path: [key],
        });
      }
    }
  });

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const env: PublicEnv = publicEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export function requirePublicSupabaseEnv() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase public environment is not configured");
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

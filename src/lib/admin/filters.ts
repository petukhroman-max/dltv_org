import { z } from "zod";

import { submissionStatusSchema } from "@/lib/domain/submission";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().max(100).optional(),
);

const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
);

export const adminSubmissionFiltersSchema = z
  .object({
    page: z.coerce.number().int().positive().catch(1),
    status: z.preprocess(
      (value) => (value === "" ? undefined : value),
      submissionStatusSchema.optional().catch(undefined),
    ),
    region: optionalText,
    start_date_from: optionalDate,
    start_date_to: optionalDate,
  })
  .transform((value) => ({
    ...value,
    limit: 26,
    offset: (value.page - 1) * 25,
  }));

export type AdminSubmissionFilters = z.output<
  typeof adminSubmissionFiltersSchema
>;

export function parseAdminSubmissionFilters(
  input: Record<string, string | string[] | undefined>,
): AdminSubmissionFilters {
  const scalarInput = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  return adminSubmissionFiltersSchema.parse(scalarInput);
}

export function buildAdminSubmissionsQuery(
  filters: AdminSubmissionFilters,
  page: number,
): string {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  if (filters.status) {
    params.set("status", filters.status);
  }
  if (filters.region) {
    params.set("region", filters.region);
  }
  if (filters.start_date_from) {
    params.set("start_date_from", filters.start_date_from);
  }
  if (filters.start_date_to) {
    params.set("start_date_to", filters.start_date_to);
  }
  const query = params.toString();
  return query ? `/admin/submissions?${query}` : "/admin/submissions";
}

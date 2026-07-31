import { z } from "zod";

export async function loadAdminSubmissionDetails<T>(
  id: string,
  load: (validId: string) => Promise<T | null>,
  handleNotFound: () => never,
): Promise<T> {
  const parsedId = z.uuid().safeParse(id);

  if (!parsedId.success) {
    return handleNotFound();
  }

  const details = await load(parsedId.data);
  if (!details) {
    return handleNotFound();
  }

  return details;
}

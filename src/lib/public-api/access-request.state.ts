import type { ApiAccessRequestInput } from "@/lib/public-api/access-request.schema";

export type ApiAccessRequestActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof ApiAccessRequestInput, string>>;
};

export const initialApiAccessRequestState: ApiAccessRequestActionState = {
  status: "idle",
};

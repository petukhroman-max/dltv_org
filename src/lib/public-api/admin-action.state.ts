export type ApiKeyActionState = {
  status: "idle" | "error" | "success";
  rawKey?: string;
  keyPrefix?: string;
  createdAt?: string;
  message?: string;
};

export const initialApiKeyActionState: ApiKeyActionState = { status: "idle" };

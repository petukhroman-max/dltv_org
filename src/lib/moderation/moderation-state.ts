export type ModerationActionState = {
  status: "idle" | "success" | "error" | "conflict";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialModerationActionState: ModerationActionState = {
  status: "idle",
};

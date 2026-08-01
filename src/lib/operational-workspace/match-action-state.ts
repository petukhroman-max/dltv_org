export type MatchActionState = {
  status: "idle" | "success" | "error" | "conflict";
  message?: string;
  fieldErrors: Record<string, string>;
  values: Record<string, string>;
};

export const initialMatchActionState: MatchActionState = {
  status: "idle",
  fieldErrors: {},
  values: {},
};

export type MatchServerAction = (
  previousState: MatchActionState,
  formData: FormData,
) => Promise<MatchActionState>;

export type MatchOperation =
  | "create"
  | "update"
  | "schedule"
  | "start"
  | "postpone"
  | "complete"
  | "walkover"
  | "cancel"
  | "reopen"
  | "delete";

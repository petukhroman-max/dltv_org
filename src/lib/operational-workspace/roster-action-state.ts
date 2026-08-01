import type { SafeRosterPlayer } from "@/lib/domain/roster-management";

export type RosterActionState = {
  status: "idle" | "success" | "error" | "conflict";
  message?: string;
  fieldErrors: Record<string, string>;
  values: Record<string, string>;
};

export type RosterSearchState = RosterActionState & {
  results: SafeRosterPlayer[];
};

export const initialRosterActionState: RosterActionState = {
  status: "idle",
  fieldErrors: {},
  values: {},
};

export const initialRosterSearchState: RosterSearchState = {
  ...initialRosterActionState,
  results: [],
};

export type RosterServerAction = (
  previousState: RosterActionState,
  formData: FormData,
) => Promise<RosterActionState>;

export type RosterSearchServerAction = (
  previousState: RosterSearchState,
  formData: FormData,
) => Promise<RosterSearchState>;

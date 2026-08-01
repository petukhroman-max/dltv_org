export type OperationalEntity = "stage" | "team";
export type OperationalOperation = "create" | "update" | "delete";

export type OperationalActionState = {
  status: "idle" | "success" | "error" | "conflict";
  message?: string;
  fieldErrors: Record<string, string>;
  values: Record<string, string>;
};

export const initialOperationalActionState: OperationalActionState = {
  status: "idle",
  fieldErrors: {},
  values: {},
};

export type OperationalServerAction = (
  previousState: OperationalActionState,
  formData: FormData,
) => Promise<OperationalActionState>;

export type StructureActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
};

export const initialStructureActionState: StructureActionState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

import type { TableRow } from "@/lib/supabase/database.types";

export type WorkspaceSubmission = Pick<
  TableRow<"tournament_submissions">,
  | "id"
  | "tournament_name"
  | "status"
  | "region"
  | "start_date"
  | "end_date"
  | "timezone"
  | "format"
>;

export type WorkspaceAccess = {
  tokenId: string;
  submission: WorkspaceSubmission;
};

export type WorkspaceTokenStatus = {
  id: string;
  state: "active" | "revoked" | "expired";
  label: string | null;
  expiresAt: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export type WorkspaceLinkActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  workspaceUrl?: string;
};

export const initialWorkspaceLinkActionState: WorkspaceLinkActionState = {
  status: "idle",
};

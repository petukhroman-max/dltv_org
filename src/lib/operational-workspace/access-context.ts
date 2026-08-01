import type { AdminIdentity } from "@/lib/admin/authorization";

export type AdminAccessContext = {
  kind: "admin";
  identity: AdminIdentity;
};

export type OrganizerWorkspaceAccessContext = {
  kind: "organizer_workspace";
  submissionId: string;
  tokenId: string;
};

export type OperationalAccessContext =
  | AdminAccessContext
  | OrganizerWorkspaceAccessContext;

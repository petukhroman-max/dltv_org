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

export type OperationalRpcAccess = {
  p_actor_type: "admin" | "organizer_workspace";
  p_actor_id: string | null;
  p_workspace_token_id: string | null;
};

export function toOperationalRpcAccess(
  context: OperationalAccessContext,
  submissionId: string,
): OperationalRpcAccess {
  if (context.kind === "admin") {
    return {
      p_actor_type: "admin",
      p_actor_id: context.identity.userId,
      p_workspace_token_id: null,
    };
  }
  if (context.submissionId !== submissionId) {
    throw new Error("operational_access_denied");
  }
  return {
    p_actor_type: "organizer_workspace",
    p_actor_id: null,
    p_workspace_token_id: context.tokenId,
  };
}

import "server-only";

type OperationalDiagnostic = {
  operation: string;
  submissionId: string;
  entityIds?: Record<string, string>;
  stableCode: string;
  databaseCode?: string;
};

export function logOperationalMutationFailure({
  operation,
  submissionId,
  entityIds = {},
  stableCode,
  databaseCode,
}: OperationalDiagnostic) {
  console.error("operational_mutation_failed", {
    operation,
    submissionId,
    entityIds,
    stableCode,
    databaseCode: databaseCode || "unknown",
  });
}

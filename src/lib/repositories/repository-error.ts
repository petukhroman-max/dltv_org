export class RepositoryError extends Error {
  constructor(message = "Database operation failed", options?: ErrorOptions) {
    super(message, options);
    this.name = "RepositoryError";
  }
}

export function toRepositoryError(error: unknown): RepositoryError {
  return new RepositoryError("Database operation failed", { cause: error });
}

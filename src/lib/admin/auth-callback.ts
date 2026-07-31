import type { AdminAuthorizationResult } from "@/lib/admin/authorization";

export const AUTH_CALLBACK_DESTINATIONS = {
  loginError: "/admin/login?error=auth",
  submissions: "/admin/submissions",
  unauthorized: "/admin/unauthorized",
} as const;

export async function resolveAuthCallbackDestination(
  code: string | null,
  dependencies: {
    exchangeCodeForSession: (code: string) => Promise<void>;
    authorizeCurrentUser: () => Promise<AdminAuthorizationResult>;
  },
): Promise<string> {
  if (!code) {
    return AUTH_CALLBACK_DESTINATIONS.loginError;
  }

  try {
    await dependencies.exchangeCodeForSession(code);
  } catch {
    return AUTH_CALLBACK_DESTINATIONS.loginError;
  }

  const authorization = await dependencies.authorizeCurrentUser();
  if (authorization.kind === "admin") {
    return AUTH_CALLBACK_DESTINATIONS.submissions;
  }
  if (authorization.kind === "unauthorized") {
    return AUTH_CALLBACK_DESTINATIONS.unauthorized;
  }
  return AUTH_CALLBACK_DESTINATIONS.loginError;
}

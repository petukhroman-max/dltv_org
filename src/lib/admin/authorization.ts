export type AdminIdentity = {
  userId: string;
  email: string;
};

export type AdminAuthorizationResult =
  | { kind: "admin"; identity: AdminIdentity }
  | { kind: "unauthenticated" }
  | { kind: "unauthorized" };

export type CurrentAuthUser = {
  id: string;
  email?: string | null;
};

export type AdminUserRecord = {
  user_id: string;
  email: string;
};

export async function authorizeAdmin(dependencies: {
  getCurrentUser: () => Promise<CurrentAuthUser | null>;
  getAdminUserByUserId: (userId: string) => Promise<AdminUserRecord | null>;
}): Promise<AdminAuthorizationResult> {
  let user: CurrentAuthUser | null;
  try {
    user = await dependencies.getCurrentUser();
  } catch {
    return { kind: "unauthenticated" };
  }

  if (!user) {
    return { kind: "unauthenticated" };
  }

  const normalizedEmail = user.email?.trim().toLowerCase();
  if (!normalizedEmail) {
    return { kind: "unauthorized" };
  }

  let adminUser: AdminUserRecord | null;
  try {
    adminUser = await dependencies.getAdminUserByUserId(user.id);
  } catch {
    return { kind: "unauthorized" };
  }

  if (
    !adminUser ||
    adminUser.user_id !== user.id ||
    adminUser.email.trim().toLowerCase() !== normalizedEmail
  ) {
    return { kind: "unauthorized" };
  }

  return {
    kind: "admin",
    identity: {
      userId: user.id,
      email: normalizedEmail,
    },
  };
}

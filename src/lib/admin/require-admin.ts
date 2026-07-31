import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { authorizeAdmin, type AdminIdentity } from "@/lib/admin/authorization";
import { getAdminUserByUserId } from "@/lib/repositories/admin-users";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAuthorizationResult() {
  noStore();
  const supabase = await createSupabaseServerClient();

  return authorizeAdmin({
    getCurrentUser: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
      };
    },
    getAdminUserByUserId,
  });
}

export async function requireAdmin(): Promise<AdminIdentity> {
  const result = await getAuthorizationResult();

  if (result.kind === "unauthenticated") {
    redirect("/admin/login");
  }
  if (result.kind === "unauthorized") {
    redirect("/admin/unauthorized");
  }

  return result.identity;
}

export async function getOptionalAdmin(): Promise<AdminIdentity | null> {
  const result = await getAuthorizationResult();
  return result.kind === "admin" ? result.identity : null;
}

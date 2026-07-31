"use server";

import "server-only";

import { adminCopy } from "@/lib/admin/copy";
import {
  processAdminMagicLinkRequest,
  type AdminLoginState,
} from "@/lib/admin/login";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestAdminMagicLinkAction(
  _previousState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  return processAdminMagicLinkRequest(
    formData.get("email"),
    async (email) => {
      const supabase = await createSupabaseServerClient();
      const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
        },
      });
      if (error) {
        throw error;
      }
    },
    {
      invalidEmail: adminCopy.login.invalidEmail,
      genericSuccess: adminCopy.login.genericSuccess,
    },
  );
}

import { z } from "zod";

export const adminLoginEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email());

export type AdminLoginState = {
  status: "idle" | "error" | "success";
  email: string;
  fieldError?: string;
  message?: string;
};

export const initialAdminLoginState: AdminLoginState = {
  status: "idle",
  email: "",
};

export async function processAdminMagicLinkRequest(
  emailInput: unknown,
  sendMagicLink: (email: string) => Promise<void>,
  copy: {
    invalidEmail: string;
    genericSuccess: string;
  },
): Promise<AdminLoginState> {
  const email = typeof emailInput === "string" ? emailInput.trim() : "";
  const parsed = adminLoginEmailSchema.safeParse(email);

  if (!parsed.success) {
    return {
      status: "error",
      email,
      fieldError: copy.invalidEmail,
    };
  }

  try {
    await sendMagicLink(parsed.data);
  } catch {
    // The public response remains identical to prevent account enumeration
    // and avoid exposing Supabase Auth details.
  }

  return {
    status: "success",
    email: parsed.data,
    message: copy.genericSuccess,
  };
}

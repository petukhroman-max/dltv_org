import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { adminCopy } from "@/lib/admin/copy";
import { getOptionalAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  noStore();
  const admin = await getOptionalAdmin();
  if (admin) {
    redirect("/admin/submissions");
  }
  const params = await searchParams;
  const hasCallbackError =
    !Array.isArray(params.error) && params.error === "auth";

  return (
    <main className="shell">
      <section className="adminLoginCard" aria-labelledby="admin-login-title">
        <p className="eyebrow">{adminCopy.login.eyebrow}</p>
        <h1 id="admin-login-title">{adminCopy.login.title}</h1>
        <p className="description">{adminCopy.login.description}</p>
        {hasCallbackError ? (
          <p className="formError" role="alert">
            {adminCopy.login.callbackError}
          </p>
        ) : null}
        <AdminLoginForm />
      </section>
    </main>
  );
}

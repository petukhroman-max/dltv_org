import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/get-dictionary";
import { getAdminCopy } from "@/lib/admin/copy";
import { getOptionalAdmin } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  noStore();
  const locale = await getRequestLocale();
  const adminCopy = getAdminCopy(locale);
  const admin = await getOptionalAdmin();
  if (admin) {
    redirect(localizePath(locale, "/admin/submissions"));
  }
  const params = await searchParams;
  const hasCallbackError =
    !Array.isArray(params.error) && params.error === "auth";

  return (
    <main className="shell">
      <section className="adminLoginCard" aria-labelledby="admin-login-title">
        <LocaleSwitcher locale={locale} label={adminCopy.nav.section} />
        <p className="eyebrow">{adminCopy.login.eyebrow}</p>
        <h1 id="admin-login-title">{adminCopy.login.title}</h1>
        <p className="description">{adminCopy.login.description}</p>
        {hasCallbackError ? (
          <p className="formError" role="alert">
            {adminCopy.login.callbackError}
          </p>
        ) : null}
        <AdminLoginForm locale={locale} />
      </section>
    </main>
  );
}

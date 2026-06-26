import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getAdminSessionFromCookies, isAdminConfigured } from "@/lib/admin-auth";

export default async function AdminLoginPage() {
  if (!isAdminConfigured()) {
    return (
      <main className="mx-auto flex min-h-full max-w-md items-center px-6 py-16">
        <div>
          <h1 className="text-2xl font-semibold">Admin unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Set <code className="rounded bg-muted px-1">ADMIN_SECRET</code> in
            Vercel environment variables, then reload.
          </p>
        </div>
      </main>
    );
  }

  const hasSession = await getAdminSessionFromCookies();
  if (hasSession) {
    redirect("/admin");
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md items-center px-6 py-16">
      <div className="w-full rounded-xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-semibold">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Private dashboard for traffic and post management.
        </p>
        <div className="mt-6">
          <AdminLoginForm />
        </div>
      </div>
    </main>
  );
}

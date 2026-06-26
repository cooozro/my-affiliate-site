import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminSessionFromCookies, isAdminConfigured } from "@/lib/admin-auth";

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    redirect("/admin/login");
  }

  const hasSession = await getAdminSessionFromCookies();
  if (!hasSession) {
    redirect("/admin/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <AdminDashboard />
    </main>
  );
}

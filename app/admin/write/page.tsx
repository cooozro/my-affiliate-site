import { redirect } from "next/navigation";
import { AdminManualWriteEditor } from "@/components/admin/admin-manual-write-editor";
import { getAdminSessionFromCookies, isAdminConfigured } from "@/lib/admin-auth";

export default async function AdminManualWritePage() {
  if (!isAdminConfigured()) redirect("/admin/login");
  const hasSession = await getAdminSessionFromCookies();
  if (!hasSession) redirect("/admin/login");

  return (
    <main className="min-h-screen bg-background">
      <AdminManualWriteEditor />
    </main>
  );
}

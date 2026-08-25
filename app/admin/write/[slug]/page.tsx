import { redirect } from "next/navigation";
import { AdminManualWriteEditor } from "@/components/admin/admin-manual-write-editor";
import { getAdminSessionFromCookies, isAdminConfigured } from "@/lib/admin-auth";

type Props = { params: Promise<{ slug: string }> };

export default async function AdminManualWriteEditPage({ params }: Props) {
  if (!isAdminConfigured()) redirect("/admin/login");
  const hasSession = await getAdminSessionFromCookies();
  if (!hasSession) redirect("/admin/login");

  const { slug } = await params;

  return (
    <main className="min-h-screen bg-background">
      <AdminManualWriteEditor initialSlug={slug} />
    </main>
  );
}

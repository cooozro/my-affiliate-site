"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function AdminNavLink() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/auth")
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => setVisible(Boolean(data.ok)))
      .catch(() => setVisible(false));
  }, []);

  if (!visible) return null;

  return (
    <Link
      href="/admin"
      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      Admin
    </Link>
  );
}

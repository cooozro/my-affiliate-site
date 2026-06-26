"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AdminNavLink() {
  const [href, setHref] = useState("/admin/login");

  useEffect(() => {
    void fetch("/api/admin/auth")
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => {
        setHref(data.ok ? "/admin" : "/admin/login");
      })
      .catch(() => setHref("/admin/login"));
  }, []);

  return (
    <Link
      href={href}
      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      Admin
    </Link>
  );
}

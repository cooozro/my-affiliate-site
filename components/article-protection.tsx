"use client";

import { useEffect, useRef } from "react";

type ArticleProtectionProps = {
  children: React.ReactNode;
};

export function ArticleProtection({ children }: ArticleProtectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }

    const blockDefault = (event: Event) => {
      event.preventDefault();
    };

    const blockClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
    };

    const blockShortcutKeys = (event: KeyboardEvent) => {
      const target = event.target as Node | null;
      if (!target || !root.contains(target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const withModifier = event.ctrlKey || event.metaKey;

      if (!withModifier) {
        return;
      }

      if (
        key === "c" ||
        key === "x" ||
        key === "a" ||
        key === "u" ||
        key === "s"
      ) {
        event.preventDefault();
      }
    };

    root.addEventListener("contextmenu", blockDefault);
    root.addEventListener("copy", blockClipboard);
    root.addEventListener("cut", blockClipboard);
    root.addEventListener("dragstart", blockDefault);
    root.addEventListener("selectstart", blockDefault);
    document.addEventListener("keydown", blockShortcutKeys);

    return () => {
      root.removeEventListener("contextmenu", blockDefault);
      root.removeEventListener("copy", blockClipboard);
      root.removeEventListener("cut", blockClipboard);
      root.removeEventListener("dragstart", blockDefault);
      root.removeEventListener("selectstart", blockDefault);
      document.removeEventListener("keydown", blockShortcutKeys);
    };
  }, []);

  return (
    <div ref={ref} className="article-protected">
      {children}
    </div>
  );
}

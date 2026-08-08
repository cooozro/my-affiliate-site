/**
 * Lightweight GFM → HTML for admin copy/export (tables, headings, lists, quotes).
 * Not a full CommonMark engine — good enough for editorial/admin reports.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" rel="noreferrer">$1</a>',
  );
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  return out;
}

function isTableSeparator(line: string): boolean {
  return /^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line.trim());
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

/**
 * Convert markdown body (no frontmatter) to an HTML fragment.
 */
export function markdownBodyToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let i = 0;
  let inUl = false;
  let inOl = false;
  let inBq = false;

  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  const closeBq = () => {
    if (inBq) {
      html.push("</blockquote>");
      inBq = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      closeLists();
      closeBq();
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      closeLists();
      closeBq();
      const lang = trimmed.slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        code.push(lines[i] ?? "");
        i += 1;
      }
      i += 1;
      html.push(
        `<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`,
      );
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1] ?? "")
    ) {
      closeLists();
      closeBq();
      const header = parseTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        rows.push(parseTableRow((lines[i] ?? "").trim()));
        i += 1;
      }
      html.push("<table><thead><tr>");
      for (const cell of header) {
        html.push(`<th>${inlineFormat(cell)}</th>`);
      }
      html.push("</tr></thead><tbody>");
      for (const row of rows) {
        html.push("<tr>");
        for (const cell of row) {
          html.push(`<td>${inlineFormat(cell)}</td>`);
        }
        html.push("</tr>");
      }
      html.push("</tbody></table>");
      continue;
    }

    const h = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (h) {
      closeLists();
      closeBq();
      const level = h[1].length;
      html.push(`<h${level}>${inlineFormat(h[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeLists();
      closeBq();
      html.push("<hr />");
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      closeLists();
      if (!inBq) {
        html.push("<blockquote>");
        inBq = true;
      }
      html.push(`<p>${inlineFormat(trimmed.slice(2))}</p>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      closeBq();
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${inlineFormat(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      i += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      closeBq();
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push("<ol>");
        inOl = true;
      }
      html.push(`<li>${inlineFormat(trimmed.replace(/^\d+\.\s+/, ""))}</li>`);
      i += 1;
      continue;
    }

    closeLists();
    closeBq();
    html.push(`<p>${inlineFormat(trimmed)}</p>`);
    i += 1;
  }

  closeLists();
  closeBq();
  return html.join("\n");
}

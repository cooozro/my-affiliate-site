/**
 * Bump frontmatter updatedAt when automated repairs change post files.
 * Repair writes must never change draft / publishedAt (publish flow only).
 */

export function bumpUpdatedAt(data) {
  return {
    ...data,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * @param {import('fs').PathOrFileDescriptor} filePath
 * @param {Record<string, unknown>} data
 * @param {string} content
 * @param {import('fs')} fs
 * @param {typeof import('gray-matter')} matter
 */
export function writeContentRepair(filePath, data, content, fs, matter) {
  const next = bumpUpdatedAt(data);

  if (Object.prototype.hasOwnProperty.call(data, "draft")) {
    next.draft = data.draft;
  }
  if (data.publishedAt != null) {
    next.publishedAt = data.publishedAt;
  }
  if (data.date != null) {
    next.date = data.date;
  }

  fs.writeFileSync(filePath, matter.stringify(content, next), "utf8");
}

/** @deprecated Use writeContentRepair */
export function writeLocaleFileWithBump(filePath, data, content, fs, matter) {
  writeContentRepair(filePath, data, content, fs, matter);
}

/**
 * @param {Record<string, unknown>} data
 * @param {boolean} contentChanged
 */
export function maybeBumpUpdatedAt(data, contentChanged) {
  if (!contentChanged) return data;
  return bumpUpdatedAt(data);
}

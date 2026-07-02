/**
 * Bump frontmatter updatedAt when automated repairs change post files.
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
export function writeLocaleFileWithBump(filePath, data, content, fs, matter) {
  fs.writeFileSync(filePath, matter.stringify(content, bumpUpdatedAt(data)), "utf8");
}

/**
 * @param {Record<string, unknown>} data
 * @param {boolean} contentChanged
 */
export function maybeBumpUpdatedAt(data, contentChanged) {
  if (!contentChanged) return data;
  return bumpUpdatedAt(data);
}

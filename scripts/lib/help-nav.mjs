/**
 * Deprecated: helpNav frontmatter was removed in Phase 7.
 * Monetization links belong inline in markdown body copy.
 */

/**
 * @param {Record<string, unknown>} data
 * @param {string} slug
 */
export function auditHelpNavFrontmatter(data, slug) {
  if (data.helpNav != null) {
    return [
      `${slug}: helpNav frontmatter is deprecated — use inline markdown links in the article body instead`,
    ];
  }
  return [];
}

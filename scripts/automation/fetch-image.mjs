/** Re-export for automation scripts in this folder. */
export { fetchCoverImage, pickImageProvider, availableImageProviders } from "../lib/cover-image.mjs";
export {
  resolveImageContext,
  deriveProductKeywords,
  buildCoverAlt,
  buildCoverAlts,
  buildSearchQueries,
} from "../lib/image-query.mjs";

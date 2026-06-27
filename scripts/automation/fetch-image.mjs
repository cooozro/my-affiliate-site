/** Re-export for automation scripts in this folder. */
export { fetchCoverImage, pickImageProvider, availableImageProviders } from "../lib/cover-image.mjs";
export {
  resolveImageContext,
  deriveProductKeywords,
  buildCoverAlt,
  buildSearchQueries,
} from "../lib/image-query.mjs";

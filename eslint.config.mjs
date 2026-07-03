import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const guardianInternalPatterns = [
  {
    group: [
      "**/guardian/editorial-standards.mjs",
      "**/guardian/content-policy.mjs",
      "**/guardian/publish-integrity.mjs",
      "**/guardian/automation-guard.mjs",
    ],
    message:
      "Import pipeline Guardian via scripts/lib/guardian/index.mjs (or deprecated shims).",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*.mjs", "scripts/**/*.js"],
    rules: {
      "no-restricted-imports": ["error", { patterns: guardianInternalPatterns }],
    },
  },
  {
    files: ["scripts/lib/guardian/**/*.mjs"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: [
      "scripts/lib/editorial-standards.mjs",
      "scripts/lib/content-policy.mjs",
      "scripts/lib/publish-integrity.mjs",
      "scripts/lib/automation-guard.mjs",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

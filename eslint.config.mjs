import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const pipelineGuardianInternalPatterns = [
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

const renderGuardianInternalPatterns = [
  {
    group: [
      "**/lib/guardian/meta",
      "**/lib/guardian/json-ld",
      "**/lib/guardian/article-chrome",
      "**/lib/guardian/publication-copy",
      "**/lib/guardian/types",
      "**/lib/seo/json-ld/compose",
      "**/lib/seo/json-ld/builders/**",
    ],
    message: "Import render Guardian via @/lib/guardian (or deprecated shims).",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["scripts/**/*.mjs", "scripts/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: pipelineGuardianInternalPatterns },
      ],
    },
  },
  {
    files: ["lib/guardian/**/*.ts", "lib/seo/json-ld/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/guardian/**", "lib/seo/json-ld/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: renderGuardianInternalPatterns },
      ],
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
      "lib/publication-copy.ts",
      "lib/split-article-content.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

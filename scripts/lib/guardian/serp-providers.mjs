/**
 * SERP provider abstraction — swap search backends via SERP_PROVIDER env.
 *
 * Supported: serper (default)
 * Add new providers by implementing createSerpProvider() shape below.
 */

import { loadEnvFile } from "../load-env.mjs";

/** @typedef {{ title: string, link: string, snippet: string, displayLink?: string }} SerpItem */

/**
 * @typedef {object} SerpProvider
 * @property {string} id
 * @property {() => boolean} isConfigured
 * @property {(keyword: string, options?: { page?: number, gl?: string, hl?: string }) => Promise<SerpItem[]>} fetchPage
 */

function normalizeOrganic(item) {
  let displayLink;
  try {
    displayLink = item.link ? new URL(item.link).hostname : undefined;
  } catch {
    displayLink = undefined;
  }

  return {
    title: String(item.title ?? "").trim(),
    link: String(item.link ?? "").trim(),
    snippet: String(item.snippet ?? "").trim(),
    displayLink,
  };
}

/** @type {SerpProvider} */
const serperProvider = {
  id: "serper",

  isConfigured() {
    loadEnvFile();
    return Boolean(process.env.SERPER_API_KEY?.trim());
  },

  async fetchPage(keyword, { page = 1, gl = "kr", hl = "ko" } = {}) {
    loadEnvFile();
    const apiKey = process.env.SERPER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("SERPER_API_KEY missing");
    }

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: keyword,
        page,
        num: 10,
        gl,
        hl,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Serper API ${response.status}: ${err.slice(0, 300)}`);
    }

    const data = await response.json();
    return (data.organic ?? []).map(normalizeOrganic).filter((item) => item.link);
  },
};

const PROVIDERS = {
  serper: serperProvider,
};

export function getSerpProviderName() {
  loadEnvFile();
  return (process.env.SERP_PROVIDER?.trim() || "serper").toLowerCase();
}

/** @returns {SerpProvider} */
export function getSerpProvider() {
  const name = getSerpProviderName();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown SERP_PROVIDER "${name}" — supported: ${Object.keys(PROVIDERS).join(", ")}`);
  }
  return provider;
}

export function isSerpConfigured() {
  return getSerpProvider().isConfigured();
}

export function listSerpProviders() {
  return Object.keys(PROVIDERS);
}

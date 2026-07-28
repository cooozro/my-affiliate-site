/**
 * OpenAI-compatible chat completions client for draft writers.
 * Providers: deepseek | openai
 */

export const LLM_PROVIDERS = {
  deepseek: {
    id: "deepseek",
    envKey: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
    url: "https://api.deepseek.com/v1/chat/completions",
  },
  openai: {
    id: "openai",
    envKey: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o-mini",
    url: "https://api.openai.com/v1/chat/completions",
  },
};

export function resolveLlmProvider(preferred) {
  const forced = (preferred ?? process.env.REPLENISH_PROVIDER ?? "")
    .trim()
    .toLowerCase();

  if (forced === "deepseek" || forced === "openai") {
    const cfg = LLM_PROVIDERS[forced];
    if (!process.env[cfg.envKey]?.trim()) {
      throw new Error(
        `${cfg.envKey} is required when REPLENISH_PROVIDER=${forced}`,
      );
    }
    return cfg;
  }

  // Prefer DeepSeek when its key is present (user-requested writer path).
  if (process.env.DEEPSEEK_API_KEY?.trim()) return LLM_PROVIDERS.deepseek;
  if (process.env.OPENAI_API_KEY?.trim()) return LLM_PROVIDERS.openai;
  return null;
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model response was not valid JSON");
  }
}

/**
 * @param {{ system: string, user: string, provider?: string, temperature?: number, json?: boolean }} options
 */
export async function chatJsonCompletion(options) {
  const {
    system,
    user,
    provider: preferred,
    temperature = 0.7,
    json = true,
  } = options;

  const provider = resolveLlmProvider(preferred);
  if (!provider) {
    throw new Error(
      "No LLM API key set. Add DEEPSEEK_API_KEY (preferred) or OPENAI_API_KEY.",
    );
  }

  const apiKey = process.env[provider.envKey].trim();
  const model =
    process.env[provider.modelEnv]?.trim() || provider.defaultModel;

  const body = {
    model,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };

  if (json) {
    // DeepSeek and OpenAI both support json_object when the prompt asks for JSON.
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `${provider.id} API ${response.status}: ${err.slice(0, 400)}`,
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error(`Empty ${provider.id} response`);
  }

  const parsed = extractJsonObject(text);
  return { provider: provider.id, model, article: parsed };
}

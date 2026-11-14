/**
 * One LLM behind one interface (docs/TRD.md section 9). The return value is `unknown`
 * on purpose: the caller parses it with Zod and then runs the faithfulness check.
 * A provider's structured-output mode is a convenience, never the guarantee.
 */
export type JsonSchema = Record<string, unknown>;

export interface LlmProvider {
  name: string;
  generateJson(args: {
    system: string;
    user: string;
    schema: JsonSchema;
    maxTokens: number;
    temperature: number;
  }): Promise<unknown>;
}

export const LLM_TIMEOUT_MS = 8_000;

/** Gemini over REST, so there is no SDK to keep in step. Server only: it reads the key. */
function gemini(apiKey: string, model: string): LlmProvider {
  return {
    name: `gemini:${model}`,
    async generateJson({ system, user, schema, maxTokens, temperature }) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              responseFormat: { text: { mimeType: "APPLICATION_JSON", schema } },
            },
          }),
        },
      );
      // The status only: never the body or the key, which must not reach a log.
      if (!res.ok) throw new Error(`LLM request failed with status ${res.status}`);
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      return JSON.parse(text);
    },
  };
}

/**
 * The provider chosen by LLM_PROVIDER, or null for "none", a missing key, or a provider
 * that is named in the docs but not built. Null means every card is a template.
 */
export function getProvider(
  env: Record<string, string | undefined> = process.env,
): LlmProvider | null {
  const provider = (env.LLM_PROVIDER ?? "none").toLowerCase();
  const key = env.LLM_API_KEY;
  if (provider === "none" || !key) return null;
  if (provider === "gemini") return gemini(key, env.LLM_MODEL || "gemini-3.8-flash");
  return null; // groq and anthropic: designed, not built
}

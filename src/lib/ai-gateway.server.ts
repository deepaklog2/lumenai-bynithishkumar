// Server-only helper for Lovable AI Gateway (Gemini).
// Do not import from client/route modules at module scope.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function geminiChat(opts: {
  system?: string;
  user: string;
  model?: string;
  json?: boolean;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.user });

  const body: Record<string, unknown> = {
    model: opts.model ?? "google/gemini-2.5-flash",
    messages,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit hit. Please retry in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
    throw new Error(`Gemini error ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function geminiJson<T>(opts: { system?: string; user: string }): Promise<T> {
  const text = await geminiChat({ ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    // try to extract JSON
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("Model did not return valid JSON");
  }
}

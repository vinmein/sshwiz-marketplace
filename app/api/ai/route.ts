import { NextResponse } from "next/server";
import { validateAdminOrApiKey } from "@/lib/apiAuth";

// Proxy one AI completion for the AI agent tab. The browser can't call the
// providers directly (CORS), so the admin's own key passes through here per
// request — it is never stored or logged server-side.

export const maxDuration = 60;

interface AiRequestBody {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  system?: string;
  prompt?: string;
}

const nonEmpty = (s: string | undefined) => (s && s.trim() !== "" ? s.trim() : undefined);

/** A base URL this server could never usefully reach — localhost/private
    addresses refer to THIS server's network, not the caller's machine.
    (Duplicated from lib/ai.ts isLocalBaseUrl, which is client-side.) */
const isLocalBase = (baseUrl: string): boolean => {
  try {
    const host = new URL(baseUrl).hostname;
    return (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "[::1]" ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
};

export async function POST(req: Request) {
  const authError = await validateAdminOrApiKey(req);
  if (authError) return authError;

  let body: AiRequestBody;
  try {
    body = (await req.json()) as AiRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const provider = body.provider ?? "anthropic";
  const model = nonEmpty(body.model);
  const system = body.system ?? "";
  const prompt = nonEmpty(body.prompt);
  const apiKey = nonEmpty(body.apiKey);
  if (!model || !prompt) {
    return NextResponse.json({ error: "model and prompt are required." }, { status: 400 });
  }
  if (provider !== "custom" && !apiKey) {
    return NextResponse.json({ error: "API key required — set it in AI settings." }, { status: 400 });
  }
  const baseUrl = nonEmpty(body.baseUrl);
  if (provider === "custom" && !baseUrl) {
    return NextResponse.json(
      { error: "baseUrl is required for the custom provider — it must be publicly reachable." },
      { status: 400 },
    );
  }
  if (baseUrl && isLocalBase(baseUrl)) {
    return NextResponse.json(
      {
        error:
          `${baseUrl} is a local address — on this server that would be the server's own network, ` +
          "not your machine. The portal calls local endpoints (e.g. Ollama) directly from your " +
          "browser; API callers must use a publicly reachable base URL.",
      },
      { status: 400 },
    );
  }

  try {
    let text: string;
    if (provider === "anthropic") {
      const base = baseUrl ?? "https://api.anthropic.com";
      const res = await fetch(`${base}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(55_000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        content?: Array<{ type: string; text?: string }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.message ?? `Anthropic error (HTTP ${res.status}).` },
          { status: 502 },
        );
      }
      text = (data.content ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("");
    } else {
      // openai and custom (any OpenAI-compatible endpoint)
      const base = baseUrl ?? "https://api.openai.com/v1";
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: prompt },
          ],
        }),
        signal: AbortSignal.timeout(55_000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        return NextResponse.json(
          { error: data.error?.message ?? `Provider error (HTTP ${res.status}).` },
          { status: 502 },
        );
      }
      text = data.choices?.[0]?.message?.content ?? "";
    }

    if (!text.trim()) return NextResponse.json({ error: "The provider returned an empty reply." }, { status: 502 });
    return NextResponse.json({ text });
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "TimeoutError"
        ? "The provider took too long to reply."
        : err instanceof Error
          ? err.message
          : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

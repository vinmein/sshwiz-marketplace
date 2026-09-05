// API-key authentication middleware for all /api/* routes.
// Keys are stored hashed (SHA-256) in the Firestore `apiKeys` collection.
// This module validates the key from the request, checks the hash against
// Firestore via the public REST API (same credential-free pattern as catalog.ts),
// and applies per-key rate limiting.

import { NextResponse } from "next/server";
import { checkRateLimit } from "./rateLimit";

const PROJECT_ID = process.env.NEXT_PUBLIC_FB_PROJECT_ID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_FB_API_KEY ?? "";

const base = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const keyParam = () => (API_KEY ? `?key=${API_KEY}` : "");

// ---------------------------------------------------------------------------
// SHA-256 hashing (Web Crypto — available in Node 18+ and edge runtimes)
// ---------------------------------------------------------------------------

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Firestore REST lookup
// ---------------------------------------------------------------------------

interface FsStringValue {
  stringValue?: string;
}
interface FsFields {
  keyHash?: FsStringValue;
  enabled?: { booleanValue?: boolean };
}

/**
 * Query Firestore for an apiKeys document whose `keyHash` matches.
 * Returns `{ id, enabled }` or `null` if no match.
 */
async function findKeyByHash(
  hash: string,
): Promise<{ id: string; enabled: boolean } | null> {
  const res = await fetch(`${base()}:runQuery${keyParam()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "apiKeys" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "keyHash" },
            op: "EQUAL",
            value: { stringValue: hash },
          },
        },
        limit: 1,
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{
    document?: { name: string; fields?: FsFields };
  }>;
  const doc = rows.find((r) => r.document)?.document;
  if (!doc) return null;
  return {
    id: doc.name.split("/").pop()!,
    enabled: doc.fields?.enabled?.booleanValue !== false,
  };
}

/**
 * Fire-and-forget: update lastUsedAt on the key document.
 * Non-blocking; errors are silently swallowed.
 */
function touchLastUsed(docId: string) {
  const url = `${base()}/apiKeys/${docId}${keyParam()}&updateMask.fieldPaths=lastUsedAt`;
  fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fields: {
        lastUsedAt: { timestampValue: new Date().toISOString() },
      },
    }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Extract the API key from the request headers.
 * Supports `Authorization: Bearer <key>` and `x-api-key: <key>`.
 */
export function extractApiKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  const header = req.headers.get("x-api-key");
  if (header) return header.trim();
  return null;
}

/**
 * Validate the API key and apply rate limiting.
 * Returns `null` if the request is authorized; otherwise returns an error Response.
 */
export async function validateApiKey(req: Request): Promise<Response | null> {
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    return NextResponse.json(
      { error: "Missing API key. Provide it via Authorization: Bearer <key> or x-api-key header." },
      { status: 401, headers: corsHeaders() },
    );
  }

  const hash = await sha256(rawKey);

  // Rate limit check (before hitting Firestore for the lookup).
  const rl = checkRateLimit(hash);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: {
          ...corsHeaders(),
          "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      },
    );
  }

  const keyDoc = await findKeyByHash(hash);
  if (!keyDoc) {
    return NextResponse.json(
      { error: "Invalid API key." },
      { status: 401, headers: corsHeaders() },
    );
  }

  if (!keyDoc.enabled) {
    return NextResponse.json(
      { error: "API key is disabled. Contact an administrator." },
      { status: 403, headers: corsHeaders() },
    );
  }

  // Fire-and-forget lastUsedAt update.
  touchLastUsed(keyDoc.id);

  return null; // Authorized ✓
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, x-api-key",
  };
}

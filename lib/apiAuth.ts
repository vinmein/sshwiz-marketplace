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

/** Pull the uid out of a Firebase ID token WITHOUT verifying it — the
    verification happens in validateAdminOrApiKey: Firestore checks the
    token's signature/expiry, and the rules only let uid read admins/{uid}. */
function decodeJwtUid(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      user_id?: unknown;
      sub?: unknown;
    };
    const uid = payload.user_id ?? payload.sub;
    return typeof uid === "string" && uid !== "" ? uid : null;
  } catch {
    return null;
  }
}

/**
 * Authorize either a marketplace API key (mk_…) or a signed-in admin's
 * Firebase ID token. Used by /api/ai, which the admin portal calls with the
 * admin's own session — no marketplace key needed there.
 *
 * The admin check is credential-free: we read admins/{uid} over Firestore
 * REST with the caller's ID token as the bearer. Firestore rejects forged or
 * expired tokens, and the security rules only allow the read when the token's
 * uid matches AND the admin doc exists.
 */
export async function validateAdminOrApiKey(req: Request): Promise<Response | null> {
  const raw = extractApiKey(req);
  if (!raw) {
    return NextResponse.json(
      { error: "Missing API key. Provide it via Authorization: Bearer <key> or x-api-key header." },
      { status: 401, headers: corsHeaders() },
    );
  }

  const uid = decodeJwtUid(raw);
  if (!uid) return validateApiKey(req); // not a JWT → treat as a marketplace key

  const rl = checkRateLimit(uid);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      {
        status: 429,
        headers: { ...corsHeaders(), "retry-after": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  const res = await fetch(`${base()}/admins/${uid}${keyParam()}`, {
    headers: { authorization: `Bearer ${raw}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => null);
  if (res?.ok) return null; // Authorized ✓

  return NextResponse.json(
    { error: "Admin session invalid or expired — sign in again." },
    { status: 401, headers: corsHeaders() },
  );
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, x-api-key",
  };
}

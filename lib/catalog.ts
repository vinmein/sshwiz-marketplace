// Server-side read-only access to the published marketplace, used by the
// public /api/marketplace routes. Reads Firestore's public REST endpoint —
// no credentials involved, so this code physically cannot see drafts: the
// security rules only permit the published == true query for anonymous
// readers. Keep the decoding in sync with the desktop app (src/marketplace.ts).

import type { MarketPackage, MarketScript } from "./types";

const PROJECT_ID = process.env.NEXT_PUBLIC_FB_PROJECT_ID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_FB_API_KEY ?? "";

export const catalogConfigured = PROJECT_ID !== "";

// --- Firestore REST value decoding -----------------------------------------

interface FsValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  nullValue?: null;
  timestampValue?: string;
  mapValue?: { fields?: Record<string, FsValue> };
  arrayValue?: { values?: FsValue[] };
}

function decodeValue(v: FsValue): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.mapValue) return decodeFields(v.mapValue.fields ?? {});
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(decodeValue);
  return null;
}

function decodeFields(fields: Record<string, FsValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
}

const base = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const keyParam = () => (API_KEY ? `?key=${API_KEY}` : "");

async function runQuery(collectionId: string): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const res = await fetch(`${base()}:runQuery${keyParam()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: { field: { fieldPath: "published" }, op: "EQUAL", value: { booleanValue: true } },
        },
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Firestore query failed (HTTP ${res.status}).`);
  const rows = (await res.json()) as Array<{ document?: { name: string; fields?: Record<string, FsValue> } }>;
  return rows
    .filter((r) => r.document)
    .map((r) => ({ id: r.document!.name.split("/").pop()!, data: decodeFields(r.document!.fields ?? {}) }));
}

/** One published document, or null when missing/unpublished (rules deny the
    anonymous read of drafts, which surfaces as a 403 — treated as null). */
async function getDocById(
  collectionId: string,
  id: string,
): Promise<{ id: string; data: Record<string, unknown> } | null> {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) return null;
  const res = await fetch(`${base()}/${collectionId}/${id}${keyParam()}`, {
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (res.status === 403 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read failed (HTTP ${res.status}).`);
  const doc = (await res.json()) as { name: string; fields?: Record<string, FsValue> };
  const data = decodeFields(doc.fields ?? {});
  if (data.published !== true) return null;
  return { id, data };
}

// --- Stable API shapes ------------------------------------------------------

export interface ApiPackage extends Omit<MarketPackage, "published"> {
  id: string;
  updatedAt: string | null;
}

export interface ApiScript extends Omit<MarketScript, "published"> {
  id: string;
  updatedAt: string | null;
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

function mapPackage(id: string, d: Record<string, unknown>): ApiPackage {
  const recipes: ApiPackage["recipes"] = {};
  if (typeof d.recipes === "object" && d.recipes !== null) {
    for (const [family, r] of Object.entries(d.recipes as Record<string, unknown>)) {
      if (typeof r !== "object" || r === null) continue;
      const rec = r as Record<string, string[]>;
      recipes[family] = {
        check: Array.isArray(rec.check) ? rec.check : [],
        install: Array.isArray(rec.install) ? rec.install : [],
        verify: Array.isArray(rec.verify) ? rec.verify : [],
      };
    }
  }
  return {
    id,
    name: str(d.name),
    description: str(d.description),
    category: str(d.category),
    icon: str(d.icon),
    recipes,
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : null,
  };
}

function mapScript(id: string, d: Record<string, unknown>): ApiScript {
  return {
    id,
    name: str(d.name),
    description: str(d.description),
    icon: str(d.icon),
    body: str(d.body),
    params: Array.isArray(d.params) ? (d.params as ApiScript["params"]) : [],
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt : null,
  };
}

// --- Public accessors -------------------------------------------------------

export async function listPackages(family?: string): Promise<ApiPackage[]> {
  const rows = await runQuery("packages");
  const items = rows.map((r) => mapPackage(r.id, r.data)).filter((p) => p.name !== "");
  return family ? items.filter((p) => p.recipes[family] !== undefined) : items;
}

export async function listScripts(): Promise<ApiScript[]> {
  const rows = await runQuery("scripts");
  return rows.map((r) => mapScript(r.id, r.data)).filter((s) => s.name !== "" && s.body !== "");
}

export async function getPackage(id: string): Promise<ApiPackage | null> {
  const row = await getDocById("packages", id);
  return row ? mapPackage(row.id, row.data) : null;
}

export async function getScript(id: string): Promise<ApiScript | null> {
  const row = await getDocById("scripts", id);
  return row ? mapScript(row.id, row.data) : null;
}

import { NextResponse } from "next/server";

// Shared response helpers for the public /api/marketplace routes: CORS open
// for GET (it's public data), and CDN caching so bursts don't hammer Firestore.

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, x-api-key",
};

export function apiJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      ...CORS,
      "cache-control":
        status === 200 ? "public, s-maxage=60, stale-while-revalidate=300" : "no-store",
    },
  });
}

export function apiError(message: string, status: number) {
  return apiJson({ error: message }, status);
}

export function apiOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

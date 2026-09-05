import { apiError, apiJson, apiOptions } from "@/lib/apiResponse";
import { catalogConfigured, getPackage, getScript } from "@/lib/catalog";

// GET /api/marketplace/packages/{id}
// GET /api/marketplace/scripts/{id}
// Only published items resolve; drafts and unknown ids are a plain 404.

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ collection: string; id: string }> },
) {
  if (!catalogConfigured) return apiError("Marketplace is not configured.", 503);
  const { collection, id } = await ctx.params;
  try {
    if (collection === "packages") {
      const item = await getPackage(id);
      return item ? apiJson(item) : apiError("Not found.", 404);
    }
    if (collection === "scripts") {
      const item = await getScript(id);
      return item ? apiJson(item) : apiError("Not found.", 404);
    }
    return apiError("Unknown collection — use packages or scripts.", 404);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err), 502);
  }
}

export const OPTIONS = apiOptions;

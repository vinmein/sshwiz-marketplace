import { apiError, apiJson, apiOptions } from "@/lib/apiResponse";
import { validateApiKey } from "@/lib/apiAuth";
import { catalogConfigured, listPackages, listScripts } from "@/lib/catalog";

// GET /api/marketplace/packages[?family=ubuntu|rhel|alpine]
// GET /api/marketplace/scripts

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const authError = await validateApiKey(req);
  if (authError) return authError;

  if (!catalogConfigured) return apiError("Marketplace is not configured.", 503);
  const { collection } = await ctx.params;
  try {
    if (collection === "packages") {
      const family = new URL(req.url).searchParams.get("family") ?? undefined;
      if (family && !["ubuntu", "rhel", "alpine"].includes(family)) {
        return apiError("family must be one of: ubuntu, rhel, alpine.", 400);
      }
      return apiJson({ packages: await listPackages(family) });
    }
    if (collection === "scripts") {
      return apiJson({ scripts: await listScripts() });
    }
    return apiError("Unknown collection — use packages or scripts.", 404);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err), 502);
  }
}

export const OPTIONS = apiOptions;

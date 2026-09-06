import { apiError, apiJson, apiOptions } from "@/lib/apiResponse";
import { validateApiKey } from "@/lib/apiAuth";
import { catalogConfigured, listPackages, listScripts } from "@/lib/catalog";

// GET /api/marketplace/packages[?family=ubuntu|rhel|alpine][&default=true]
// GET /api/marketplace/scripts[?default=true]
// Every item carries isDefault; ?default=true narrows to the default catalog.

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ collection: string }> }) {
  const authError = await validateApiKey(req);
  if (authError) return authError;

  if (!catalogConfigured) return apiError("Marketplace is not configured.", 503);
  const { collection } = await ctx.params;
  const search = new URL(req.url).searchParams;
  const defaultOnly = ["1", "true"].includes(search.get("default") ?? "");
  try {
    if (collection === "packages") {
      const family = search.get("family") ?? undefined;
      if (family && !["ubuntu", "rhel", "alpine"].includes(family)) {
        return apiError("family must be one of: ubuntu, rhel, alpine.", 400);
      }
      const packages = await listPackages(family);
      return apiJson({ packages: defaultOnly ? packages.filter((p) => p.isDefault) : packages });
    }
    if (collection === "scripts") {
      const scripts = await listScripts();
      return apiJson({ scripts: defaultOnly ? scripts.filter((s) => s.isDefault) : scripts });
    }
    return apiError("Unknown collection — use packages or scripts.", 404);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err), 502);
  }
}

export const OPTIONS = apiOptions;

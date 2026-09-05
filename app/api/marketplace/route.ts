import { apiError, apiJson, apiOptions } from "@/lib/apiResponse";
import { validateApiKey } from "@/lib/apiAuth";
import { catalogConfigured, listPackages, listScripts } from "@/lib/catalog";

// GET /api/marketplace — every published package and script.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authError = await validateApiKey(req);
  if (authError) return authError;

  if (!catalogConfigured) return apiError("Marketplace is not configured.", 503);
  try {
    const [packages, scripts] = await Promise.all([listPackages(), listScripts()]);
    return apiJson({ packages, scripts });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err), 502);
  }
}

export const OPTIONS = apiOptions;

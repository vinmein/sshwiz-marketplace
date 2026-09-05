import { apiError, apiJson, apiOptions } from "@/lib/apiResponse";
import { catalogConfigured, listPackages, listScripts } from "@/lib/catalog";

// GET /api/marketplace — every published package and script.

export const dynamic = "force-dynamic";

export async function GET() {
  if (!catalogConfigured) return apiError("Marketplace is not configured.", 503);
  try {
    const [packages, scripts] = await Promise.all([listPackages(), listScripts()]);
    return apiJson({ packages, scripts });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : String(err), 502);
  }
}

export const OPTIONS = apiOptions;

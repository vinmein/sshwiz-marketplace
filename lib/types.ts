// Document shapes for the marketplace collections. The sshwiz desktop app
// reads these over the Firestore REST API (src/marketplace.ts) — keep the
// field names in sync with its decoder.

export interface MarketRecipe {
  check: string[];
  install: string[];
  verify: string[];
}

export interface MarketPackage {
  name: string;
  description: string;
  category: string;
  icon: string;
  /** Keyed by distro family: "ubuntu" | "rhel" | "alpine". */
  recipes: Record<string, MarketRecipe>;
  published: boolean;
  /** Part of the app's default catalog (shipped/recommended out of the box). */
  isDefault?: boolean;
}

export interface MarketScriptParam {
  key: string;
  shellVar: string;
  label: string;
  placeholder?: string;
  default?: string;
  required?: boolean;
  secret?: boolean;
  type?: "select";
  options?: { value: string; label: string }[];
}

export interface MarketScript {
  name: string;
  description: string;
  icon: string;
  body: string;
  params: MarketScriptParam[];
  published: boolean;
  /** Part of the app's default catalog (shipped/recommended out of the box). */
  isDefault?: boolean;
}

export const FAMILIES = ["ubuntu", "rhel", "alpine"] as const;
export const FAMILY_LABEL: Record<string, string> = {
  ubuntu: "Ubuntu / Debian",
  rhel: "RHEL / Fedora",
  alpine: "Alpine",
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

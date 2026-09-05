// AI assist for the portal: provider config (kept in the admin's browser
// localStorage — never in Firestore) and generation/parsing of marketplace
// packages and scripts. The prompts, JSON-repair and danger checks mirror the
// desktop app (src/ai.ts, src/aiRecipe.ts, src/aiScript.ts) — keep in sync.

import type { MarketPackage, MarketScript, MarketScriptParam } from "./types";
import { FAMILIES } from "./types";

// --- Provider config -------------------------------------------------------

export type AiProvider = "anthropic" | "openai" | "custom";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export const PROVIDER_DEFAULTS: Record<AiProvider, { model: string; baseUrl: string; keyLabel: string }> = {
  anthropic: { model: "claude-sonnet-5", baseUrl: "", keyLabel: "Anthropic API key" },
  openai: { model: "gpt-4o-mini", baseUrl: "", keyLabel: "OpenAI API key" },
  custom: { model: "", baseUrl: "http://localhost:11434/v1", keyLabel: "API key" },
};

const STORE_KEY = "sshwiz-portal-ai-config";

export function loadAiConfig(): AiConfig | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as AiConfig;
    return c && typeof c === "object" && c.provider ? c : null;
  } catch {
    return null;
  }
}

export function saveAiConfig(config: AiConfig) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(config));
  } catch {
    // Private windows etc. — settings just won't persist.
  }
}

export function clearAiConfig() {
  try {
    localStorage.removeItem(STORE_KEY);
  } catch {
    // ignore
  }
}

/** One completion via our /api/ai proxy (browsers can't call providers directly). */
export async function aiComplete(config: AiConfig, system: string, prompt: string): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...config, system, prompt }),
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok || !data.text) throw new Error(data.error ?? `AI request failed (HTTP ${res.status}).`);
  return data.text;
}

// --- Prompts (mirroring the desktop app) -----------------------------------

export const RECIPE_SYSTEM =
  "You write install recipes for a Linux server provisioning tool. " +
  "Reply with ONLY a JSON object inside a single ```json fenced code block — no prose before or after. " +
  'Shape: {"name": string, "description": string (one sentence), "category": string (one word, e.g. Database), ' +
  '"icon": string (one emoji), "recipes": {"ubuntu": R, "rhel": R, "alpine": R}} where ' +
  'R = {"check": string[], "install": string[], "verify": string[]}. ' +
  "Rules: every entry is one non-interactive shell line run over SSH. " +
  'check commands exit 0 only when the package is already installed (e.g. "command -v mongod"). ' +
  'install commands use sudo where needed; on apt use "sudo DEBIAN_FRONTEND=noninteractive apt-get install -y …" ' +
  'and run "sudo apt-get update" first. Prefer the official vendor repository when distro packages lag badly. ' +
  "verify commands print a version or service status. " +
  "Enable and start services where that is the expected default (systemctl on ubuntu/rhel, rc-update/rc-service on alpine). " +
  "If a family genuinely cannot run the package, omit that family from recipes. " +
  "Never include destructive commands (rm -rf, mkfs, dd, firewall flush, reboot).";

export const SCRIPT_SYSTEM =
  "You write reusable server administration scripts for an SSH provisioning tool. " +
  "Reply with ONLY a JSON object inside a single ```json fenced code block — no prose before or after. " +
  'Shape: {"name": string, "description": string (1–2 sentences, note any preconditions), ' +
  '"icon": string (one emoji), "params": P[], "body": string} where ' +
  'P = {"key": string (camelCase), "shellVar": string (UPPER_SNAKE), "label": string, ' +
  '"placeholder"?: string, "default"?: string, "required"?: boolean, ' +
  '"secret"?: boolean (true for passwords, tokens and other sensitive values — rendered masked), ' +
  '"type"?: "text"|"select", "options"?: [{"value": string, "label": string}]}. ' +
  "The reply must parse with JSON.parse: the body is one JSON string with every newline escaped " +
  'as \\n — never a YAML block scalar (no `"body": |`) — and never use non-JSON escapes like \\$. ' +
  "The body is a POSIX shell script executed with `set -e` over SSH on a Linux server; " +
  'each param is prepended as a safely quoted shell variable, so reference them as "$SHELLVAR". ' +
  "Rules: fully non-interactive (use -y flags, DEBIAN_FRONTEND=noninteractive); use sudo where needed; " +
  "check preconditions and exit 1 with a clear message when unmet; prefer idempotent scripts that are " +
  "safe to re-run; echo a short success line at the end. Ask for a param instead of hardcoding anything " +
  "the user would want to change (domains, ports, sizes, usernames). " +
  "Never include destructive commands (rm -rf on data, mkfs, dd to disks, firewall flush, reboot) unless " +
  "the task explicitly requires them — and then guard them behind a 'Type YES to confirm' required param. " +
  "Secret hygiene: never echo or printf a secret param's value to output; feed secrets over stdin " +
  "(e.g. printf '%s:%s' \"$USER\" \"$PASS\" | sudo chpasswd) instead of command-line flags, which are " +
  "visible in ps and shell history; chmod 600 any file a secret is written into.";

const FAMILY_PROMPT_LABEL: Record<string, string> = {
  ubuntu: "Ubuntu/Debian (apt, systemd)",
  rhel: "RHEL/Fedora (dnf, systemd)",
  alpine: "Alpine (apk, OpenRC)",
};

/** family "all" (or undefined) keeps the default all-families behavior;
    a specific family constrains the generation to that distribution. */
export const recipePrompt = (request: string, family?: string) =>
  `Write the install recipe for: ${request}` +
  (family && family !== "all"
    ? ` — target ONLY the "${family}" distro family (${FAMILY_PROMPT_LABEL[family]}); omit every other family from "recipes".`
    : "");

export const scriptPrompt = (request: string, family?: string) =>
  `Write the script for: ${request}` +
  (family && family !== "all"
    ? ` The target servers run ${FAMILY_PROMPT_LABEL[family]} — use that family's package manager and service tooling only.`
    : "");

// --- Loose JSON parsing (mirrors src/ai.ts) --------------------------------

export function parseLooseJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*\n([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The reply contains no JSON object.");
  const slice = raw.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch (err) {
    try {
      return JSON.parse(repairJsonStrings(quoteBareValues(slice)));
    } catch {
      try {
        return JSON.parse(repairJsonStrings(quoteBareValues(repairYamlBlockScalars(slice))));
      } catch {
        throw new Error(`The reply is not valid JSON: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}

function quoteBareValues(json: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    out += ch;
    if (ch !== ":" || inStr) continue;
    let j = i + 1;
    while (j < json.length && (json[j] === " " || json[j] === "\t")) j++;
    const c = json[j];
    if (c === undefined || c === '"' || c === "{" || c === "[" || c === "\n") continue;
    let k = j;
    while (k < json.length && !",}]\n".includes(json[k])) k++;
    const token = json.slice(j, k).trim();
    if (token === "" || /^(true|false|null|-?\d+(\.\d+)?([eE][+-]?\d+)?)$/.test(token)) continue;
    out += json.slice(i + 1, j) + JSON.stringify(token);
    i = k - 1;
  }
  return out;
}

function repairYamlBlockScalars(json: string): string {
  const lines = json.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(\s*)("[^"]+"\s*:)\s*([|>][+-]?)(?:[ \t]+(\S.*?))?\s*$/);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const block: string[] = m[4] ? [m[4]] : [];
    let j = i + 1;
    while (j < lines.length) {
      const t = lines[j].trim();
      if (/^"[^"\n]*"\s*:/.test(t) || /^[}\]]/.test(t)) break;
      block.push(lines[j]);
      j++;
    }
    while (block.length > 0 && block[block.length - 1].trim() === "") block.pop();
    const indents = block.filter((l) => l.trim() !== "").map((l) => l.length - l.trimStart().length);
    const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
    const text = block.map((l) => (l.trim() === "" ? "" : l.slice(minIndent))).join("\n");
    const needsComma = j < lines.length && lines[j].trim().startsWith('"');
    out.push(`${m[1]}${m[2]} ${JSON.stringify(text)}${needsComma ? "," : ""}`);
    i = j - 1;
  }
  return out.join("\n");
}

const JSON_ESCAPES = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);

function repairJsonStrings(json: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of json) {
    if (!inStr) {
      if (ch === '"') inStr = true;
      out += ch;
      continue;
    }
    if (esc) {
      out += JSON_ESCAPES.has(ch) ? `\\${ch}` : ch;
      esc = false;
    } else if (ch === "\\") {
      esc = true;
    } else if (ch === '"') {
      inStr = false;
      out += ch;
    } else if (ch === "\n") {
      out += "\\n";
    } else if (ch === "\r") {
      out += "\\r";
    } else if (ch === "\t") {
      out += "\\t";
    } else {
      out += ch;
    }
  }
  return out;
}

export function sanitizeBody(body: string): string {
  let out = body.replace(/\r\n?/g, "\n");
  out = out.replace(/^\s*```[^\n]*\n/, "").replace(/\n```\s*$/, "");
  out = out.replace(/^\s*#![^\n]*\n/, "");
  return out.trim();
}

// --- Danger flags (mirrors src/ai.ts) --------------------------------------

const DANGER_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\brm\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR][a-zA-Z]*f|\brm\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*f[a-zA-Z]*[rR]/, label: "recursive force delete" },
  { re: /\bdd\s+.*\bof=\/dev\//, label: "raw disk write (dd)" },
  { re: /\bmkfs(\.\w+)?\b/, label: "filesystem format" },
  { re: /\b(shutdown|reboot|halt|poweroff)\b/, label: "reboot/shutdown" },
  { re: /:\(\)\s*\{\s*:\|:\s*&\s*\}\s*;\s*:/, label: "fork bomb" },
  { re: /\bchmod\s+(-R\s+)?777\s+\//, label: "chmod 777 on /" },
  { re: /\b(iptables|nft|ufw)\b.*\b(flush|-F|reset|disable)\b/i, label: "firewall flush/disable" },
  { re: /(>|\btee\s+(?!-a\s))\s*\/etc\/sudoers(?!\.d)\b/, label: "direct /etc/sudoers overwrite" },
  { re: /\bDROP\s+(TABLE|DATABASE)\b/i, label: "SQL drop" },
  { re: />\s*\/dev\/sd[a-z]\b/, label: "raw disk write" },
];

export function dangerFlags(command: string): string[] {
  return DANGER_PATTERNS.filter((p) => p.re.test(command)).map((p) => p.label);
}

// --- Reply → marketplace document ------------------------------------------

const asLines = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];

/** Family keys models actually emit, mapped onto the three the app knows. */
const FAMILY_ALIASES: Record<string, string> = {
  ubuntu: "ubuntu",
  debian: "ubuntu",
  rhel: "rhel",
  fedora: "rhel",
  centos: "rhel",
  rocky: "rhel",
  almalinux: "rhel",
  alpine: "alpine",
};

const toRecipe = (r: Record<string, unknown>) => ({
  check: asLines(r.check),
  install: asLines(r.install),
  verify: asLines(r.verify),
});

/**
 * `fallbackFamily`: when the reply skips the family nesting entirely (models
 * do this when asked for a single distro — a bare {check, install, verify}
 * either under "recipes" or at the top level), file it under this family.
 */
export function parsePackageReply(text: string, fallbackFamily = "ubuntu"): MarketPackage {
  const obj = parseLooseJson(text) as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) throw new Error("The recipe has no name.");
  const recipes: MarketPackage["recipes"] = {};
  const src = (obj.recipes ?? {}) as Record<string, unknown>;
  for (const [key, r] of Object.entries(src)) {
    const family = FAMILY_ALIASES[key.toLowerCase()];
    if (!family || recipes[family] || !r || typeof r !== "object") continue;
    const recipe = toRecipe(r as Record<string, unknown>);
    if (recipe.install.length > 0) recipes[family] = recipe;
  }
  if (Object.keys(recipes).length === 0) {
    // No family keys — accept a bare recipe under "recipes" or at top level.
    for (const candidate of [src, obj]) {
      const recipe = toRecipe(candidate);
      if (recipe.install.length > 0) {
        recipes[fallbackFamily] = recipe;
        break;
      }
    }
  }
  if (Object.keys(recipes).length === 0) {
    throw new Error("The recipe has no install commands for any supported distro family.");
  }
  return {
    name,
    description:
      typeof obj.description === "string" && obj.description.trim()
        ? obj.description.trim()
        : "AI-generated recipe.",
    category: typeof obj.category === "string" && obj.category.trim() ? obj.category.trim() : "Marketplace",
    icon: typeof obj.icon === "string" && obj.icon.trim() ? obj.icon.trim() : "📦",
    recipes,
    published: false,
  };
}

const SHELL_VAR_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function asParam(v: unknown, index: number): MarketScriptParam | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Record<string, unknown>;
  const label = typeof p.label === "string" ? p.label.trim() : "";
  const key = typeof p.key === "string" && p.key.trim() ? p.key.trim() : `param${index}`;
  let shellVar = typeof p.shellVar === "string" ? p.shellVar.trim() : "";
  if (!SHELL_VAR_RE.test(shellVar)) {
    shellVar = key.replace(/[^A-Za-z0-9_]/g, "_").replace(/^([0-9])/, "_$1").toUpperCase();
  }
  if (!label || !SHELL_VAR_RE.test(shellVar)) return null;
  const options = Array.isArray(p.options)
    ? p.options
        .map((o) => o as Record<string, unknown>)
        .filter((o) => typeof o?.value === "string" && typeof o?.label === "string")
        .map((o) => ({ value: o.value as string, label: o.label as string }))
    : undefined;
  const param: MarketScriptParam = { key, shellVar, label };
  if (typeof p.placeholder === "string" && p.placeholder) param.placeholder = p.placeholder;
  if (typeof p.default === "string") param.default = p.default;
  if (p.required === true) param.required = true;
  if (p.secret === true) param.secret = true;
  if (p.type === "select" && options && options.length > 0) {
    param.type = "select";
    param.options = options;
  }
  return param;
}

export function parseScriptReply(text: string): MarketScript {
  const obj = parseLooseJson(text) as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  if (!name) throw new Error("The script has no name.");
  const body = typeof obj.body === "string" ? sanitizeBody(obj.body) : "";
  if (!body) throw new Error("The script has no body.");
  const params = Array.isArray(obj.params)
    ? obj.params.map(asParam).filter((p): p is MarketScriptParam => p !== null)
    : [];
  const seen = new Set<string>();
  const deduped = params.filter((p) => !seen.has(p.shellVar) && (seen.add(p.shellVar), true));
  return {
    name,
    description:
      typeof obj.description === "string" && obj.description.trim()
        ? obj.description.trim()
        : "AI-generated script.",
    icon: typeof obj.icon === "string" && obj.icon.trim() ? obj.icon.trim() : "📜",
    params: deduped,
    body,
    published: false,
  };
}

/** Danger labels across the whole item; empty = fine. */
export function packageDangerFlags(pkg: MarketPackage): string[] {
  const flags = new Set<string>();
  for (const recipe of Object.values(pkg.recipes)) {
    for (const line of [...recipe.check, ...recipe.install, ...recipe.verify]) {
      for (const f of dangerFlags(line)) flags.add(f);
    }
  }
  return [...flags];
}

export function scriptDangerFlags(script: MarketScript): string[] {
  const flags = new Set<string>();
  for (const line of script.body.split("\n")) for (const f of dangerFlags(line)) flags.add(f);
  return [...flags];
}

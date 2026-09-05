"use client";

import { useEffect, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FAMILIES, FAMILY_LABEL, slugify, type MarketPackage, type MarketScript } from "@/lib/types";
import {
  PROVIDER_DEFAULTS,
  RECIPE_SYSTEM,
  SCRIPT_SYSTEM,
  aiComplete,
  clearAiConfig,
  loadAiConfig,
  packageDangerFlags,
  parsePackageReply,
  parseScriptReply,
  recipePrompt,
  saveAiConfig,
  scriptDangerFlags,
  scriptPrompt,
  type AiConfig,
  type AiProvider,
} from "@/lib/ai";

const PROVIDERS: Array<{ id: AiProvider; label: string; hint: string }> = [
  { id: "anthropic", label: "Anthropic", hint: "Claude models via api.anthropic.com" },
  { id: "openai", label: "OpenAI", hint: "GPT models via api.openai.com" },
  { id: "custom", label: "Custom / Ollama", hint: "Any OpenAI-compatible endpoint (key optional)" },
];

const EMPTY_CONFIG: AiConfig = {
  provider: "anthropic",
  apiKey: "",
  baseUrl: "",
  model: PROVIDER_DEFAULTS.anthropic.model,
};

/** The 🤖 AI agent tab: configure a provider, generate a package or script
    draft, review it (danger flags included), save it unpublished. */
export default function AiAgent() {
  const [config, setConfig] = useState<AiConfig>(EMPTY_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mode, setMode] = useState<"package" | "script">("package");
  const [family, setFamily] = useState("all");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pkg, setPkg] = useState<MarketPackage | null>(null);
  const [script, setScript] = useState<MarketScript | null>(null);
  const [docId, setDocId] = useState("");
  const [savedId, setSavedId] = useState("");
  /** Raw model reply, kept when parsing fails so the admin can inspect it. */
  const [rawReply, setRawReply] = useState("");

  useEffect(() => {
    const stored = loadAiConfig();
    if (stored) setConfig(stored);
    else setShowSettings(true);
    setConfigLoaded(true);
  }, []);

  const configured = config.model.trim() !== "" && (config.provider === "custom" || config.apiKey !== "");

  function switchProvider(p: AiProvider) {
    setConfig({
      provider: p,
      apiKey: "",
      baseUrl: PROVIDER_DEFAULTS[p].baseUrl,
      model: PROVIDER_DEFAULTS[p].model,
    });
  }

  function persistConfig() {
    saveAiConfig(config);
    setStatus("Settings saved in this browser.");
  }

  async function testConfig() {
    setBusy(true);
    setError("");
    setStatus("Contacting provider…");
    try {
      saveAiConfig(config);
      const reply = await aiComplete(config, "", "Reply with exactly: OK");
      setStatus(`Provider responded: “${reply.trim().slice(0, 60)}” — AI is ready.`);
      setShowSettings(false);
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!prompt.trim() || busy) return;
    if (!configured) {
      setShowSettings(true);
      setError("Configure the AI provider first.");
      return;
    }
    setBusy(true);
    setError("");
    setStatus("Generating…");
    setPkg(null);
    setScript(null);
    setSavedId("");
    setRawReply("");
    let text = "";
    try {
      text =
        mode === "package"
          ? await aiComplete(config, RECIPE_SYSTEM, recipePrompt(prompt.trim(), family))
          : await aiComplete(config, SCRIPT_SYSTEM, scriptPrompt(prompt.trim(), family));
      if (mode === "package") {
        const parsed = parsePackageReply(text, family !== "all" ? family : "ubuntu");
        if (family !== "all") {
          const r = parsed.recipes[family];
          if (!r) throw new Error(`The reply has no ${FAMILY_LABEL[family]} recipe — try again.`);
          parsed.recipes = { [family]: r };
        }
        setPkg(parsed);
        setDocId(slugify(parsed.name) + (family !== "all" ? `-${family}` : ""));
      } else {
        const parsed = parseScriptReply(text);
        setScript(parsed);
        setDocId(slugify(parsed.name) + (family !== "all" ? `-${family}` : ""));
      }
      setStatus("");
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : String(err));
      setRawReply(text);
    } finally {
      setBusy(false);
    }
  }

  async function save(publish: boolean) {
    const item = pkg ?? script;
    const id = docId.trim() || slugify(item?.name ?? "");
    if (!item || !id) return;
    setBusy(true);
    setError("");
    try {
      await setDoc(doc(db(), pkg ? "packages" : "scripts", id), {
        ...item,
        published: publish,
        updatedAt: serverTimestamp(),
      });
      setSavedId(id);
      setStatus(
        publish
          ? `Published “${id}” — it is now live in the app's Market tab. Edit it any time in the ${pkg ? "📦 Packages" : "📜 Scripts"} tab.`
          : `Saved “${id}” as a draft — review, edit and publish it in the ${pkg ? "📦 Packages" : "📜 Scripts"} tab.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const flags = pkg ? packageDangerFlags(pkg) : script ? scriptDangerFlags(script) : [];

  if (!configLoaded) return null;

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <p className="muted grow" style={{ margin: 0 }}>
          Describe a package or task; the AI drafts it, you review the preview, then save it to the
          marketplace — as a <strong>draft</strong> to polish first, or <strong>publish</strong> it
          straight to the app's Market tab.
        </p>
        <button onClick={() => setShowSettings((v) => !v)}>⚙️ AI settings</button>
      </div>

      {showSettings && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>AI provider</h2>
          <p className="muted">
            Bring your own key. It's kept in this browser's local storage only — never in Firestore —
            and each request passes it through this portal's own server to your provider.
          </p>
          <div className="tabs" style={{ margin: "10px 0" }}>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                className={config.provider === p.id ? "active" : ""}
                onClick={() => switchProvider(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="muted">{PROVIDERS.find((p) => p.id === config.provider)!.hint}</p>
          <div className="grid2">
            <label>
              {PROVIDER_DEFAULTS[config.provider].keyLabel}
              {config.provider === "custom" ? " (optional)" : ""}
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="sk-…"
              />
            </label>
            <label>
              Model
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder={config.provider === "custom" ? "llama3.1" : PROVIDER_DEFAULTS[config.provider].model}
              />
            </label>
          </div>
          <label>
            Base URL{config.provider !== "custom" ? " (optional override)" : ""}
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder={
                config.provider === "anthropic"
                  ? "https://api.anthropic.com"
                  : config.provider === "openai"
                    ? "https://api.openai.com/v1"
                    : "http://localhost:11434/v1"
              }
            />
          </label>
          <div className="actions">
            <button className="primary" onClick={testConfig} disabled={busy || !configured}>
              {busy ? "Testing…" : "Save & test"}
            </button>
            <button onClick={persistConfig} disabled={busy || !config.model.trim()}>
              Save
            </button>
            <button
              className="danger"
              onClick={() => {
                clearAiConfig();
                setConfig(EMPTY_CONFIG);
                setStatus("AI settings removed from this browser.");
              }}
            >
              Forget settings
            </button>
          </div>
        </div>
      )}

      <div className="tabs" style={{ alignItems: "center" }}>
        <button className={mode === "package" ? "active" : ""} onClick={() => setMode("package")}>
          📦 Package recipe
        </button>
        <button className={mode === "script" ? "active" : ""} onClick={() => setMode("script")}>
          📜 Script
        </button>
        <label style={{ margin: "0 0 0 auto" }}>
          Distro family
          <select value={family} onChange={(e) => setFamily(e.target.value)} style={{ marginTop: 2 }}>
            <option value="all">
              {mode === "package" ? "All (one recipe per family)" : "Any (generic commands)"}
            </option>
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                {FAMILY_LABEL[f]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row">
        <input
          type="text"
          className="grow"
          style={{ marginTop: 0 }}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          placeholder={
            mode === "package"
              ? "e.g. mongodb, or redis 7 with the service enabled"
              : "e.g. backup a postgres database to /var/backups"
          }
        />
        <button className="primary" onClick={generate} disabled={busy || !prompt.trim()}>
          {busy ? "Working…" : "Generate"}
        </button>
      </div>

      {status && <p className="muted" style={{ marginTop: 10 }}>{status}</p>}
      {error && <p className="error">{error}</p>}
      {error && rawReply && (
        <details style={{ marginTop: 8 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>
            Show the raw model reply
          </summary>
          <pre style={{ maxHeight: 320, overflow: "auto" }}>
            <code>{rawReply}</code>
          </pre>
        </details>
      )}
      {flags.length > 0 && (
        <p className="error">⚠️ Needs a careful look: {flags.join("; ")} — review before saving.</p>
      )}

      {pkg && (
        <div className="card">
          <div className="row">
            <span className="icon">{pkg.icon}</span>
            <div className="grow">
              <strong>{pkg.name}</strong> <span className="muted">· {pkg.category}</span>
              <div className="muted">{pkg.description}</div>
            </div>
          </div>
          {Object.entries(pkg.recipes).map(([family, r]) => (
            <div key={family}>
              <h2>{FAMILY_LABEL[family] ?? family}</h2>
              {(
                [
                  ["check", r.check],
                  ["install", r.install],
                  ["verify", r.verify],
                ] as const
              ).map(
                ([label, lines]) =>
                  lines.length > 0 && (
                    <div key={label}>
                      <div className="muted">{label}</div>
                      <pre>
                        <code>{lines.join("\n")}</code>
                      </pre>
                    </div>
                  ),
              )}
            </div>
          ))}
        </div>
      )}

      {script && (
        <div className="card">
          <div className="row">
            <span className="icon">{script.icon}</span>
            <div className="grow">
              <strong>{script.name}</strong>
              <div className="muted">{script.description}</div>
            </div>
          </div>
          {script.params.length > 0 && (
            <>
              <h2>Inputs</h2>
              <ul>
                {script.params.map((p) => (
                  <li key={p.key}>
                    <code>${p.shellVar}</code> — {p.label}
                    {p.secret ? " 🔒" : ""}
                    {p.required ? " (required)" : ""}
                    {p.type === "select" && p.options
                      ? `: ${p.options.map((o) => o.label).join(" / ")}`
                      : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
          <h2>Body</h2>
          <pre>
            <code>{script.body}</code>
          </pre>
        </div>
      )}

      {(pkg || script) && (
        <div className="row" style={{ alignItems: "flex-end" }}>
          <label style={{ margin: 0 }}>
            Document ID
            <input
              type="text"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              disabled={savedId !== ""}
            />
          </label>
          <button className="primary" onClick={() => save(false)} disabled={busy || savedId !== ""}>
            {savedId ? "✓ Saved" : "Save as draft"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={busy || savedId !== "" || flags.length > 0}
            title={
              flags.length > 0
                ? "Has danger warnings — save as a draft and review it first"
                : "Save and make it live in the app's Market tab immediately"
            }
          >
            Save & publish
          </button>
        </div>
      )}
    </div>
  );
}

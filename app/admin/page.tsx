"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import AiAgent from "../AiAgent";
import AuthShell, { friendlyAuthError, PasswordInput } from "../AuthShell";
import {
  packageDangerFlags,
  parseLooseJson,
  parsePackageReply,
  parseScriptReply,
  scriptDangerFlags,
} from "@/lib/ai";
import {
  FAMILIES,
  FAMILY_LABEL,
  slugify,
  type MarketPackage,
  type MarketScript,
  type MarketScriptParam,
} from "@/lib/types";

type Gate = "loading" | "signedout" | "notadmin" | "admin";

export default function Page() {
  const [gate, setGate] = useState<Gate>("loading");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(auth(), async (u) => {
      setUser(u);
      if (!u) {
        setGate("signedout");
        return;
      }
      try {
        const admin = await getDoc(doc(db(), "admins", u.uid));
        setGate(admin.exists() ? "admin" : "notadmin");
      } catch {
        setGate("notadmin");
      }
    });
  }, []);

  if (!firebaseConfigured) {
    return (
      <main>
        <h1>sshwiz Marketplace Admin</h1>
        <p className="sub">
          Firebase is not configured. Copy <code>.env.local.example</code> to{" "}
          <code>.env.local</code> and fill in your project&apos;s web-app config, then restart.
        </p>
      </main>
    );
  }

  if (gate === "admin" && user) return <Dashboard user={user} />;

  return (
    <AuthShell>
      {gate === "loading" && <p className="auth-loading">Loading…</p>}
      {gate === "signedout" && <Login />}
      {gate === "notadmin" && user && <NotAdmin user={user} />}
    </AuthShell>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await signInWithEmailAndPassword(auth(), email, password);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email.trim()) {
      setError("Enter your email above first, then click “Forgot password?”.");
      return;
    }
    setError("");
    setNotice("");
    try {
      await sendPasswordResetEmail(auth(), email.trim());
      setNotice(`Password reset email sent to ${email.trim()} — check your inbox.`);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  }

  return (
    <form onSubmit={submit}>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-sub">Sign in to manage the marketplace.</p>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          required
          autoFocus
        />
      </label>
      <label>
        <span className="label-row">
          Password
          <button type="button" className="linklike" onClick={resetPassword}>
            Forgot password?
          </button>
        </span>
        <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" required />
      </label>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}
      <button className="primary auth-submit" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="auth-alt">
        No account yet? <Link href="/register">Create one</Link>
      </p>
    </form>
  );
}

/** Signed in, but not on the `admins` allowlist. Surfaces the UID an existing
    admin needs (registration never grants access by itself — see rules). */
function NotAdmin({ user }: { user: User }) {
  const [copied, setCopied] = useState(false);

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the UID is still visible to copy by hand.
    }
  }

  return (
    <div>
      <div className="auth-pending">⏳</div>
      <h1 className="auth-title">Awaiting approval</h1>
      <p className="auth-sub">
        <strong>{user.email}</strong> is signed in but doesn&apos;t have admin access yet.
      </p>
      <p className="muted">
        Ask an existing admin to create a Firestore document at <code>admins/&lt;your UID&gt;</code>{" "}
        (any content, e.g. <code>{"{ email: … }"}</code>) in the Firebase console. Your UID:
      </p>
      <div className="row" style={{ marginTop: 8 }}>
        <code className="grow" style={{ overflowWrap: "anywhere" }}>
          {user.uid}
        </code>
        <button type="button" onClick={copyUid}>{copied ? "✓ Copied" : "Copy UID"}</button>
      </div>
      <button className="primary auth-submit" type="button" onClick={() => window.location.reload()}>
        I&apos;ve been added — reload
      </button>
      <p className="auth-alt">
        Not you?{" "}
        <button type="button" className="linklike" onClick={() => signOut(auth())}>
          Sign out
        </button>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Row<T> {
  id: string;
  data: T;
}

function useCollection<T>(name: string): Row<T>[] {
  const [rows, setRows] = useState<Row<T>[]>([]);
  useEffect(
    () =>
      onSnapshot(collection(db(), name), (snap) => {
        setRows(
          snap.docs
            .map((d) => ({ id: d.id, data: d.data() as T }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        );
      }),
    [name],
  );
  return rows;
}

// ---------------------------------------------------------------------------
// API Key helpers
// ---------------------------------------------------------------------------

const MARKETPLACE_KEY_STORE = "sshwiz-marketplace-api-key";

function loadMarketplaceKey(): string {
  try {
    return localStorage.getItem(MARKETPLACE_KEY_STORE) ?? "";
  } catch {
    return "";
  }
}

function saveMarketplaceKey(key: string) {
  try {
    if (key) localStorage.setItem(MARKETPLACE_KEY_STORE, key);
    else localStorage.removeItem(MARKETPLACE_KEY_STORE);
  } catch {}
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return "mk_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface ApiKeyDoc {
  name: string;
  keyHash: string;
  keyPrefix: string;
  enabled: boolean;
  createdAt: unknown;
  lastUsedAt: unknown;
}

// ---------------------------------------------------------------------------

function Dashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<"packages" | "scripts" | "ai" | "apikeys">("packages");
  const packages = useCollection<MarketPackage>("packages");
  const scripts = useCollection<MarketScript>("scripts");
  const apiKeys = useCollection<ApiKeyDoc>("apiKeys");
  const [editing, setEditing] = useState<string | null>(null); // doc id, "new" or "import"
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "default">("all");
  const [search, setSearch] = useState("");
  const [marketplaceKey, setMarketplaceKey] = useState("");

  useEffect(() => {
    setMarketplaceKey(loadMarketplaceKey());
  }, []);

  const updateMarketplaceKey = useCallback((key: string) => {
    setMarketplaceKey(key);
    saveMarketplaceKey(key);
  }, []);

  useEffect(() => {
    setEditing(null);
    setFilter("all");
    setSearch("");
  }, [tab]);

  async function togglePublished(col: string, id: string, published: boolean) {
    await updateDoc(doc(db(), col, id), { published: !published, updatedAt: serverTimestamp() });
  }

  async function toggleDefault(col: string, id: string, isDefault: boolean) {
    await updateDoc(doc(db(), col, id), { isDefault: !isDefault, updatedAt: serverTimestamp() });
  }

  async function remove(col: string, id: string, name: string) {
    if (!window.confirm(`Delete "${name}" from the marketplace? This cannot be undone.`)) return;
    await deleteDoc(doc(db(), col, id));
    if (editing === id) setEditing(null);
  }

  const isCatalog = tab === "packages" || tab === "scripts";
  const kind = tab === "packages" ? "package" : "script";
  const rows: Array<Row<MarketPackage> | Row<MarketScript>> =
    tab === "packages" ? packages : tab === "scripts" ? scripts : [];

  const q = search.trim().toLowerCase();
  const visible = rows.filter((r) => {
    if (filter === "published" && !r.data.published) return false;
    if (filter === "draft" && r.data.published) return false;
    if (filter === "default" && !r.data.isDefault) return false;
    if (!q) return true;
    return [r.id, r.data.name, r.data.description].some((s) => (s ?? "").toLowerCase().includes(q));
  });

  const editingRow = editing && editing !== "new" && editing !== "import" ? rows.find((r) => r.id === editing) : undefined;
  const title =
    tab === "packages" ? "Packages" : tab === "scripts" ? "Scripts" : tab === "ai" ? "AI Agent" : "API Keys";

  const FILTERS: Array<{ key: typeof filter; label: string }> = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "draft", label: "Draft" },
    { key: "default", label: "★ Default" },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">🛒</span> sshwiz
        </div>
        <nav className="side-nav">
          <button className={tab === "packages" ? "active" : ""} onClick={() => setTab("packages")}>
            📦 Packages <span className="count">{packages.length}</span>
          </button>
          <button className={tab === "scripts" ? "active" : ""} onClick={() => setTab("scripts")}>
            📜 Scripts <span className="count">{scripts.length}</span>
          </button>
          <button className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>
            🤖 AI Agent
          </button>
          <button className={tab === "apikeys" ? "active" : ""} onClick={() => setTab("apikeys")}>
            🔑 API Keys <span className="count">{apiKeys.length}</span>
          </button>
        </nav>
        <div className="side-label">Tools</div>
        <nav className="side-nav">
          <Link href="/docs">📖 Authoring guide</Link>
        </nav>
        <div className="side-user">
          <span className="avatar">{(user.email ?? "?").slice(0, 1)}</span>
          <div className="who">
            <strong title={user.email ?? undefined}>{user.email}</strong>
            <span>Admin</span>
          </div>
          <button onClick={() => signOut(auth())}>Sign out</button>
        </div>
      </aside>

      <section className="content">
        <div className="page-head">
          <h1>{title}</h1>
          {isCatalog && (
            <>
              <button onClick={() => setEditing("import")}>⬆ Import JSON</button>
              <button className="primary" onClick={() => setEditing("new")}>
                ＋ New {kind}
              </button>
            </>
          )}
        </div>

        {tab === "ai" && <AiAgent />}

        {tab === "apikeys" && (
          <ApiKeysTab keys={apiKeys} activeKey={marketplaceKey} onSetActiveKey={updateMarketplaceKey} />
        )}

        {isCatalog && (
          <>
            <div className="toolbar">
              <div className="filter-pills">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={filter === f.key ? "active" : ""}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="search">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${tab}…`}
                />
              </div>
            </div>

            {visible.length === 0 ? (
              <div className="empty">
                <div className="big">{tab === "packages" ? "📦" : "📜"}</div>
                {rows.length === 0
                  ? `No ${tab} yet — create one, import JSON, or use the AI agent.`
                  : "Nothing matches the current filter."}
              </div>
            ) : (
              <div className="cards-grid">
                {visible.map((r) => (
                  <div className="item-card" key={r.id}>
                    <div className="item-head">
                      <span className="item-icon">{r.data.icon || (tab === "packages" ? "📦" : "📜")}</span>
                      <div className="title">
                        <strong title={r.data.name}>{r.data.name}</strong>
                        <div className="id">{r.id}</div>
                      </div>
                      <div className="item-badges">
                        <span className={`pill ${r.data.published ? "live" : "draft"}`}>
                          {r.data.published ? "Published" : "Draft"}
                        </span>
                        {r.data.isDefault && <span className="pill default">★ Default</span>}
                      </div>
                    </div>
                    <p className="item-desc" title={r.data.description}>
                      {r.data.description || "No description."}
                    </p>
                    <div className="item-foot">
                      <button className="soft" onClick={() => setEditing(r.id)}>
                        ⚙ Edit
                      </button>
                      <button
                        onClick={() => toggleDefault(tab, r.id, r.data.isDefault ?? false)}
                        title={r.data.isDefault ? "Remove from the default catalog" : "Mark as a default item"}
                      >
                        {r.data.isDefault ? "★" : "☆"} Default
                      </button>
                      <button onClick={() => togglePublished(tab, r.id, r.data.published)}>
                        {r.data.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        className="danger"
                        style={{ flex: "0 0 auto" }}
                        onClick={() => remove(tab, r.id, r.data.name)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {isCatalog && editing !== null && (
          <div
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && setEditing(null)}
          >
            <div className="modal">
              <div className="modal-head">
                <h2>
                  {editing === "new"
                    ? `New ${kind}`
                    : editing === "import"
                      ? "⬆ Import JSON"
                      : `Edit ${editingRow?.data.name ?? editing}`}
                </h2>
                <button onClick={() => setEditing(null)} title="Close">
                  ✕
                </button>
              </div>
              {editing === "import" ? (
                <ImportCard onDone={() => setEditing(null)} />
              ) : tab === "packages" ? (
                <PackageForm
                  id={editingRow?.id}
                  initial={editingRow?.data as MarketPackage | undefined}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <ScriptForm
                  id={editingRow?.id}
                  initial={editingRow?.data as MarketScript | undefined}
                  onDone={() => setEditing(null)}
                />
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Import JSON — accepts the desktop app's export format (extra "sshwiz" /
// "version" keys are ignored) as well as bare portal-shaped items, then
// prefills the normal edit form so the admin reviews before saving.
// ---------------------------------------------------------------------------

type ImportedItem =
  | { kind: "package"; data: MarketPackage }
  | { kind: "script"; data: MarketScript };

function ImportCard({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState<ImportedItem | null>(null);

  function parse() {
    setError("");
    try {
      const obj = parseLooseJson(text) as Record<string, unknown>;
      if (obj.sshwiz === "package" || (obj.recipes && !obj.body)) {
        setParsed({ kind: "package", data: parsePackageReply(text) });
      } else if (obj.sshwiz === "script" || obj.body) {
        setParsed({ kind: "script", data: parseScriptReply(text) });
      } else {
        throw new Error(
          'Not a recognizable item — expected a script (with a "body") or a package (with "recipes").',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setError("");
  }

  if (parsed) {
    const flags =
      parsed.kind === "package" ? packageDangerFlags(parsed.data) : scriptDangerFlags(parsed.data);
    return (
      <div>
        <div className="row">
          <span className="icon">{parsed.data.icon}</span>
          <div className="grow">
            <strong>{parsed.data.name}</strong>{" "}
            <span className="muted">· imported {parsed.kind}</span>
          </div>
          <button onClick={() => setParsed(null)}>← Back to JSON</button>
        </div>
        {flags.length > 0 && (
          <p className="error">⚠ Contains potentially dangerous commands: {flags.join(", ")}.</p>
        )}
        <p className="muted">
          Review below, adjust the document ID if needed, then save — it lands as a draft you can
          publish from the list.
        </p>
        {parsed.kind === "package" ? (
          <PackageForm initial={parsed.data} onDone={onDone} />
        ) : (
          <ScriptForm initial={parsed.data} onDone={onDone} />
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="muted">
        Paste one script or package as JSON — the desktop app&apos;s format (with{" "}
        <code>&quot;sshwiz&quot;</code> and <code>&quot;version&quot;</code> keys) works as-is. One
        item per import.
      </p>
      <textarea
        rows={12}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"sshwiz": "script", "name": "…", "body": "…", "params": […]}'
        spellCheck={false}
        style={{ fontFamily: "monospace" }}
      />
      <div className="row" style={{ marginTop: 8 }}>
        <input type="file" accept=".json,application/json" onChange={pickFile} className="grow" />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="primary" onClick={parse} disabled={!text.trim()}>
          Parse &amp; review
        </button>
        <button onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API Keys tab
// ---------------------------------------------------------------------------

function ApiKeysTab({
  keys,
  activeKey,
  onSetActiveKey,
}: {
  keys: Row<ApiKeyDoc>[];
  activeKey: string;
  onSetActiveKey: (key: string) => void;
}) {
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function createKey() {
    const name = newKeyName.trim();
    if (!name) {
      setError("Give the key a descriptive name.");
      return;
    }
    setBusy(true);
    setError("");
    setCreatedKey(null);
    try {
      const rawKey = generateRawKey();
      const keyHash = await sha256(rawKey);
      const keyPrefix = rawKey.slice(0, 11) + "…";
      const id = slugify(name) || `key-${Date.now()}`;
      await setDoc(doc(db(), "apiKeys", id), {
        name,
        keyHash,
        keyPrefix,
        enabled: true,
        createdAt: serverTimestamp(),
        lastUsedAt: null,
      });
      setCreatedKey(rawKey);
      setNewKeyName("");
      // Auto-set as active key in this browser if none is set.
      if (!activeKey) onSetActiveKey(rawKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await updateDoc(doc(db(), "apiKeys", id), { enabled: !enabled });
  }

  async function deleteKey(id: string, name: string) {
    if (!window.confirm(`Delete API key "${name}"? Clients using this key will lose access.`)) return;
    await deleteDoc(doc(db(), "apiKeys", id));
  }

  async function copyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  const formatTs = (v: unknown) => {
    if (!v || typeof v !== "object") return "—";
    const ts = v as { seconds?: number; toDate?: () => Date };
    if (ts.toDate) return ts.toDate().toLocaleString();
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleString();
    return "—";
  };

  return (
    <div>
      <p className="muted">
        API keys authenticate requests to all <code>/api/*</code> endpoints. Create a key here, then
        include it in your requests as <code>Authorization: Bearer mk_…</code> or{" "}
        <code>x-api-key: mk_…</code>.
      </p>

      {/* Active key for this browser */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>🖥️ This browser&apos;s active key</h2>
        <p className="muted">
          Stored in localStorage — used automatically for AI agent requests from this admin portal.
        </p>
        <div className="row">
          <input
            type="password"
            className="grow"
            value={activeKey}
            onChange={(e) => onSetActiveKey(e.target.value)}
            placeholder="Paste a marketplace API key here (mk_…)"
            style={{ fontFamily: "monospace" }}
          />
          {activeKey && (
            <button className="danger" onClick={() => onSetActiveKey("")}>
              Clear
            </button>
          )}
        </div>
        {activeKey && (
          <p className="muted" style={{ marginTop: 4 }}>
            ✓ Key set ({activeKey.slice(0, 11)}…)
          </p>
        )}
      </div>

      {/* Create new key */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Create a new API key</h2>
        <div className="row">
          <input
            type="text"
            className="grow"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createKey()}
            placeholder='Descriptive name, e.g. "Production Desktop App"'
          />
          <button className="primary" onClick={createKey} disabled={busy}>
            {busy ? "Creating…" : "Create key"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {createdKey && (
          <div style={{ marginTop: 12, padding: 12, background: "var(--bg-card, #1a1a2e)", borderRadius: 8, border: "1px solid #4ecca3" }}>
            <p>
              <strong>🔑 Copy your API key now — it won&apos;t be shown again:</strong>
            </p>
            <div className="row">
              <code className="grow" style={{ overflowWrap: "anywhere", fontSize: 13 }}>
                {createdKey}
              </code>
              <button onClick={() => copyKey(createdKey)}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
              <button onClick={() => { onSetActiveKey(createdKey); }}>
                Use in this browser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Key list */}
      {keys.length === 0 ? (
        <p className="muted">No API keys yet. Create one above.</p>
      ) : (
        keys.map((k) => (
          <div className="card" key={k.id}>
            <div className="row">
              <div className="grow">
                <strong>{k.data.name}</strong>{" "}
                <span className="muted">· {k.data.keyPrefix}</span>
                <div className="muted" style={{ fontSize: 12 }}>
                  Created: {formatTs(k.data.createdAt)} · Last used: {formatTs(k.data.lastUsedAt)}
                </div>
              </div>
              <span className={`pill ${k.data.enabled ? "live" : "draft"}`}>
                {k.data.enabled ? "Active" : "Disabled"}
              </span>
              <button onClick={() => toggleEnabled(k.id, k.data.enabled)}>
                {k.data.enabled ? "Disable" : "Enable"}
              </button>
              <button className="danger" onClick={() => deleteKey(k.id, k.data.name)}>
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const splitLines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

function PackageForm({
  id,
  initial,
  onDone,
}: {
  id?: string;
  initial?: MarketPackage;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "📦");
  const [category, setCategory] = useState(initial?.category ?? "Marketplace");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [docId, setDocId] = useState(id ?? "");
  // One set of commands + a family selector, like the desktop app's editor:
  // "all" writes the same commands to every family; a specific family edits
  // just that family and leaves the others in the document untouched.
  const initialFamily = (() => {
    if (!initial) return "all";
    const present = FAMILIES.filter((f) => initial.recipes?.[f]);
    if (present.length === FAMILIES.length) {
      const dumps = present.map((f) => JSON.stringify(initial.recipes[f]));
      if (dumps.every((d) => d === dumps[0])) return "all";
    }
    return present[0] ?? "all";
  })();
  const recipeText = (fam: string) => {
    const r = initial?.recipes?.[fam === "all" ? "ubuntu" : fam];
    return {
      check: r?.check.join("\n") ?? "",
      install: r?.install.join("\n") ?? "",
      verify: r?.verify.join("\n") ?? "",
    };
  };
  const [family, setFamily] = useState<string>(initialFamily);
  const [cmds, setCmds] = useState(() => recipeText(initialFamily));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finalId = id ?? (docId.trim() || slugify(name));
  const otherFamilies = FAMILIES.filter(
    (f) => initial?.recipes?.[f] && f !== family && family !== "all",
  );

  function switchFamily(f: string) {
    setFamily(f);
    setCmds(recipeText(f));
  }

  async function save() {
    if (!name.trim() || !finalId || !cmds.install.trim()) {
      setError("A name and install commands are required.");
      return;
    }
    const recipe = {
      check: splitLines(cmds.check),
      install: splitLines(cmds.install),
      verify: splitLines(cmds.verify),
    };
    const built: MarketPackage["recipes"] =
      family === "all"
        ? Object.fromEntries(FAMILIES.map((f) => [f, recipe]))
        : { ...(initial?.recipes ?? {}), [family]: recipe };
    setBusy(true);
    setError("");
    try {
      await setDoc(doc(db(), "packages", finalId), {
        name: name.trim(),
        icon: icon.trim() || "📦",
        category: category.trim() || "Marketplace",
        description: description.trim(),
        recipes: built,
        published: initial?.published ?? false,
        isDefault: initial?.isDefault ?? false,
        updatedAt: serverTimestamp(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid2">
        <label>
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Icon (emoji)
          <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </label>
        <label>
          Category
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label>
          Document ID {id ? "(fixed)" : ""}
          <input
            type="text"
            value={finalId}
            disabled={Boolean(id)}
            onChange={(e) => setDocId(e.target.value)}
          />
        </label>
      </div>
      <div className="grid2">
        <label>
          Description
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>
          Distro family
          <select value={family} onChange={(e) => switchFamily(e.target.value)}>
            <option value="all">All (same commands)</option>
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                {FAMILY_LABEL[f]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {otherFamilies.length > 0 && (
        <p className="muted">
          This package also has recipes for {otherFamilies.map((f) => FAMILY_LABEL[f]).join(", ")} —
          they stay unchanged; you&apos;re editing {FAMILY_LABEL[family]} only.
        </p>
      )}
      <label>
        Check commands (one per line — exit 0 = already installed)
        <textarea
          rows={2}
          value={cmds.check}
          onChange={(e) => setCmds({ ...cmds, check: e.target.value })}
        />
      </label>
      <label>
        Install commands (one per line)
        <textarea
          rows={3}
          value={cmds.install}
          onChange={(e) => setCmds({ ...cmds, install: e.target.value })}
        />
      </label>
      <label>
        Verify commands (one per line)
        <textarea
          rows={2}
          value={cmds.verify}
          onChange={(e) => setCmds({ ...cmds, verify: e.target.value })}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save package"}
        </button>
        <button onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ParamDraft {
  shellVar: string;
  label: string;
  placeholder: string;
  default: string;
  required: boolean;
  secret: boolean;
  /** One "value|Label" per line; non-empty = a select input. */
  choices: string;
}

function toParamDraft(p: MarketScriptParam): ParamDraft {
  return {
    shellVar: p.shellVar,
    label: p.label,
    placeholder: p.placeholder ?? "",
    default: p.default ?? "",
    required: p.required ?? false,
    secret: p.secret ?? false,
    choices: (p.options ?? []).map((o) => (o.label !== o.value ? `${o.value}|${o.label}` : o.value)).join("\n"),
  };
}

function fromParamDraft(d: ParamDraft): MarketScriptParam | null {
  const shellVar = d.shellVar.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!shellVar) return null;
  const options = splitLines(d.choices).map((line) => {
    const [value, label] = line.split("|");
    return { value: value.trim(), label: (label ?? value).trim() };
  });
  const param: MarketScriptParam = {
    key: shellVar.toLowerCase(),
    shellVar,
    label: d.label.trim() || shellVar,
    required: d.required,
  };
  if (d.placeholder.trim()) param.placeholder = d.placeholder.trim();
  if (d.default.trim()) param.default = d.default.trim();
  if (d.secret) param.secret = true;
  if (options.length > 0) {
    param.type = "select";
    param.options = options;
  }
  return param;
}

function ScriptForm({
  id,
  initial,
  onDone,
}: {
  id?: string;
  initial?: MarketScript;
  onDone: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "📜");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [docId, setDocId] = useState(id ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [params, setParams] = useState<ParamDraft[]>(() => (initial?.params ?? []).map(toParamDraft));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const finalId = id ?? (docId.trim() || slugify(name));
  const undeclared = useMemo(() => {
    const declared = new Set(params.map((p) => p.shellVar.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_")));
    const refs = [...body.matchAll(/\$\{?([A-Z][A-Z0-9_]*)\b/g)].map((m) => m[1]);
    return [...new Set(refs.filter((r) => !declared.has(r)))];
  }, [body, params]);

  async function save() {
    if (!name.trim() || !finalId || !body.trim()) {
      setError("Name and script body are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await setDoc(doc(db(), "scripts", finalId), {
        name: name.trim(),
        icon: icon.trim() || "📜",
        description: description.trim(),
        body,
        params: params.map(fromParamDraft).filter((p): p is MarketScriptParam => p !== null),
        published: initial?.published ?? false,
        isDefault: initial?.isDefault ?? false,
        updatedAt: serverTimestamp(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function updateParam(i: number, patch: Partial<ParamDraft>) {
    setParams(params.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  }

  return (
    <div>
      <div className="grid2">
        <label>
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Icon (emoji)
          <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} />
        </label>
      </div>
      <label>
        Description
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <label>
        Document ID {id ? "(fixed)" : ""}
        <input type="text" value={finalId} disabled={Boolean(id)} onChange={(e) => setDocId(e.target.value)} />
      </label>

      <h2>Inputs</h2>
      {params.map((p, i) => (
        <div className="card" key={i}>
          <div className="grid2">
            <label>
              Shell variable
              <input type="text" value={p.shellVar} onChange={(e) => updateParam(i, { shellVar: e.target.value })} />
            </label>
            <label>
              Label
              <input type="text" value={p.label} onChange={(e) => updateParam(i, { label: e.target.value })} />
            </label>
            <label>
              Placeholder
              <input type="text" value={p.placeholder} onChange={(e) => updateParam(i, { placeholder: e.target.value })} />
            </label>
            <label>
              Default
              <input type="text" value={p.default} onChange={(e) => updateParam(i, { default: e.target.value })} />
            </label>
          </div>
          <label>
            Choices (optional; one per line as value|Label — makes this a dropdown)
            <textarea rows={2} value={p.choices} onChange={(e) => updateParam(i, { choices: e.target.value })} />
          </label>
          <div className="row">
            <label className="checkbox">
              <input type="checkbox" checked={p.required} onChange={(e) => updateParam(i, { required: e.target.checked })} />
              Required
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={p.secret} onChange={(e) => updateParam(i, { secret: e.target.checked })} />
              Secret
            </label>
            <div className="grow" />
            <button className="danger" onClick={() => setParams(params.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() =>
          setParams([
            ...params,
            { shellVar: "", label: "", placeholder: "", default: "", required: false, secret: false, choices: "" },
          ])
        }
      >
        ＋ Add input
      </button>

      <label>
        Script body (runs with set -e over SSH; reference inputs as $VAR)
        <textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} />
      </label>
      {undeclared.length > 0 && (
        <p className="error">
          The body references {undeclared.map((v) => `$${v}`).join(", ")} but no input declares{" "}
          {undeclared.length === 1 ? "it" : "them"} — add matching inputs or fix the body.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="primary" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save script"}
        </button>
        <button onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

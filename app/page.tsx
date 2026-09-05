"use client";

import { useEffect, useMemo, useState } from "react";
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
import { auth, db, firebaseConfigured } from "@/lib/firebase";
import AiAgent from "./AiAgent";
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

  return (
    <main>
      <div className="row">
        <div className="grow">
          <h1>🛒 sshwiz Marketplace Admin</h1>
          <p className="sub">Packages and scripts published here appear in the app&apos;s Market tab.</p>
        </div>
        <Link className="pill" href="/docs">
          📖 Authoring guide
        </Link>
        {user && (
          <button onClick={() => signOut(auth())} title={user.email ?? undefined}>
            Sign out
          </button>
        )}
      </div>

      {gate === "loading" && <p className="muted">Loading…</p>}
      {gate === "signedout" && <Login />}
      {gate === "notadmin" && user && <NotAdmin user={user} />}
      {gate === "admin" && <Dashboard />}
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth(), email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} style={{ maxWidth: 380 }}>
      <h2 style={{ marginTop: 0 }}>Sign in</h2>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
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
    <div className="card">
      <p>
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
        <button onClick={copyUid}>{copied ? "✓ Copied" : "Copy UID"}</button>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        Once added, reload this page.
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

function Dashboard() {
  const [tab, setTab] = useState<"packages" | "scripts" | "ai">("packages");
  const packages = useCollection<MarketPackage>("packages");
  const scripts = useCollection<MarketScript>("scripts");
  const [editing, setEditing] = useState<string | null>(null); // doc id or "new"

  useEffect(() => setEditing(null), [tab]);

  async function togglePublished(col: string, id: string, published: boolean) {
    await updateDoc(doc(db(), col, id), { published: !published, updatedAt: serverTimestamp() });
  }

  async function remove(col: string, id: string, name: string) {
    if (!window.confirm(`Delete "${name}" from the marketplace? This cannot be undone.`)) return;
    await deleteDoc(doc(db(), col, id));
    if (editing === id) setEditing(null);
  }

  const rows: Array<Row<MarketPackage> | Row<MarketScript>> = tab === "packages" ? packages : tab === "scripts" ? scripts : [];

  return (
    <>
      <div className="tabs">
        <button className={tab === "packages" ? "active" : ""} onClick={() => setTab("packages")}>
          📦 Packages ({packages.length})
        </button>
        <button className={tab === "scripts" ? "active" : ""} onClick={() => setTab("scripts")}>
          📜 Scripts ({scripts.length})
        </button>
        <button className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>
          🤖 AI agent
        </button>
      </div>

      {tab === "ai" && <AiAgent />}

      {tab !== "ai" && rows.map((r) => (
        <div className="card" key={r.id}>
          <div className="row">
            <span className="icon">{r.data.icon || (tab === "packages" ? "📦" : "📜")}</span>
            <div className="grow">
              <strong>{r.data.name}</strong> <span className="muted">· {r.id}</span>
              <div className="muted">{r.data.description}</div>
            </div>
            <span className={`pill ${r.data.published ? "live" : "draft"}`}>
              {r.data.published ? "Published" : "Draft"}
            </span>
            <button onClick={() => togglePublished(tab, r.id, r.data.published)}>
              {r.data.published ? "Unpublish" : "Publish"}
            </button>
            <button onClick={() => setEditing(editing === r.id ? null : r.id)}>
              {editing === r.id ? "Close" : "Edit"}
            </button>
            <button className="danger" onClick={() => remove(tab, r.id, r.data.name)}>
              Delete
            </button>
          </div>
          {editing === r.id &&
            (tab === "packages" ? (
              <PackageForm id={r.id} initial={r.data as MarketPackage} onDone={() => setEditing(null)} />
            ) : (
              <ScriptForm id={r.id} initial={r.data as MarketScript} onDone={() => setEditing(null)} />
            ))}
        </div>
      ))}

      {tab !== "ai" &&
        (editing === "new" ? (
          <div className="card">
            {tab === "packages" ? (
              <PackageForm onDone={() => setEditing(null)} />
            ) : (
              <ScriptForm onDone={() => setEditing(null)} />
            )}
          </div>
        ) : (
          <button className="primary" onClick={() => setEditing("new")}>
            ＋ New {tab === "packages" ? "package" : "script"}
          </button>
        ))}
    </>
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

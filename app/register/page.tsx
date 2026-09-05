"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";

/**
 * Creates the Firebase Auth account only. Admin access is a separate,
 * deliberate step: an owner adds an `admins/{uid}` document (see
 * firestore.rules) — registration alone grants nothing.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth(), email, password);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!firebaseConfigured) {
    return (
      <main>
        <h1>Create account</h1>
        <p className="sub">Firebase is not configured — see the README.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>🛒 sshwiz Marketplace Admin</h1>
      <p className="sub">Create an account. An existing admin then has to grant you access.</p>
      <form className="card" onSubmit={submit} style={{ maxWidth: 380 }}>
        <h2 style={{ marginTop: 0 }}>Create account</h2>
        <label>
          Name (optional)
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          Password (at least 6 characters)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button className="primary" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Already have an account? <Link href="/">Sign in</Link>
        </p>
      </form>
    </main>
  );
}

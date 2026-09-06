"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, firebaseConfigured } from "@/lib/firebase";
import AuthShell, { friendlyAuthError, PasswordInput } from "../AuthShell";

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

  const mismatch = confirm.length > 0 && password !== confirm;

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
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }

  if (!firebaseConfigured) {
    return (
      <AuthShell>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Firebase is not configured — see the README.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={submit}>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">An existing admin then has to grant you access.</p>
        <label>
          Name <span className="optional">(optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Ada Lovelace"
            autoFocus
          />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </label>
        <label>
          Password <span className="optional">(at least 6 characters)</span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" minLength={6} required />
        </label>
        <label>
          Confirm password
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" required />
        </label>
        {mismatch && <p className="error">Passwords don&apos;t match.</p>}
        {error && <p className="error">{error}</p>}
        <button className="primary auth-submit" disabled={busy || mismatch}>
          {busy ? "Creating account…" : "Create account"}
        </button>
        <p className="auth-alt">
          Already have an account? <Link href="/">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

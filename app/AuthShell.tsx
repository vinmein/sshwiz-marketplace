"use client";

import { useState } from "react";

/** Shared split-panel layout for the sign-in / register / not-admin screens. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <aside className="auth-hero">
        <div className="auth-hero-inner">
          <div className="auth-logo">🛒</div>
          <h1>sshwiz Marketplace</h1>
          <p>
            The admin portal for everything that appears in the sshwiz app&apos;s Market tab —
            curated packages, one-click scripts, and the AI agent that helps you author them.
          </p>
          <ul>
            <li>
              <span>📦</span> Publish install packages per distro family
            </li>
            <li>
              <span>📜</span> Ship parameterized one-click scripts
            </li>
            <li>
              <span>🤖</span> Draft and review with the AI agent
            </li>
          </ul>
        </div>
      </aside>
      <main className="auth-side">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}

/** Maps Firebase Auth error codes to messages a person can act on. */
export function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "That doesn't look like a valid email address.";
    case "auth/email-already-in-use":
      return "An account with this email already exists — sign in instead.";
    case "auth/weak-password":
      return "That password is too weak — use at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes, then try again.";
    case "auth/network-request-failed":
      return "Network error — check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact an administrator.";
    default:
      return err instanceof Error ? err.message : String(err);
  }
}

export function PasswordInput({
  value,
  onChange,
  autoComplete,
  minLength,
  required,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="pw-wrap">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
      >
        {visible ? "🙈" : "👁"}
      </button>
    </div>
  );
}

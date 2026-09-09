import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "../SiteChrome";
import s from "../landing.module.css";
import { PRIVACY_PATH, SECURITY_EMAIL, SUPPORT_EMAIL, SUPPORT_PATH } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support · sshwiz",
  description:
    "How to get help with sshwiz — where to write, what to include, and where to find the answers that are already written down.",
  alternates: { canonical: SUPPORT_PATH },
};

// Static: this is the Support URL the store listings point at, so it must
// resolve even when Firestore or the AI proxy are having a bad day.
export const dynamic = "force-static";

export default function SupportPage() {
  return (
    <LegalShell
      kicker="Support"
      title="Stuck? Write to a human."
      lede="sshwiz is in its Phase 1 preview and support is handled by the people who build it. There's no ticket portal to sign up for — one email address, answered in order."
    >
      <div className={s.contact}>
        <p className={s.contactMail}>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          We aim to reply within two business days. Preview releases get bug reports triaged first.
        </p>
      </div>

      <h2>What to put in the mail</h2>
      <p>
        The more of this you include, the fewer round trips it takes — most of it is one glance at
        the app.
      </p>
      <ul>
        <li>
          <b>Your sshwiz version</b> and the operating system you run it on (macOS, Linux or
          Windows).
        </li>
        <li>
          <b>The target server&apos;s distribution</b> — Ubuntu/Debian, RHEL/Fedora or Alpine — and
          its version.
        </li>
        <li>
          <b>What you clicked</b>, what you expected, and what happened instead.
        </li>
        <li>
          <b>The terminal output.</b> sshwiz streams every command and its output into the terminal
          panel; copy the relevant part in. Redact anything you&apos;d rather not send —{" "}
          <b>never include a password, a private key or an API key</b>. We never need them.
        </li>
      </ul>

      <h2>Answers that already exist</h2>
      <ul>
        <li>
          <Link href="/#faq">The FAQ</Link> covers the questions people ask first: whether anything
          is installed on your server (no), where your keys live (your machine only), and what
          happens when you install the same package twice.
        </li>
        <li>
          <Link href="/docs">The authoring guide</Link> is the full reference for writing packages
          and scripts — every field, what it does when it reaches the app, and the mistakes worth
          avoiding.
        </li>
        <li>
          <Link href="/#security">How sshwiz handles credentials</Link> — encrypted at rest, sudo
          piped over stdin, and nothing run without showing you the commands first.
        </li>
      </ul>

      <h2>Reporting a security issue</h2>
      <p>
        Please report vulnerabilities privately to{" "}
        <a href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a> rather than in a public issue —
        put <b>Security:</b> at the start of the subject line and it gets triaged ahead of ordinary
        support mail. Include the version, the steps to reproduce, and what an attacker could do
        with it, and give us a reasonable window to ship a fix before disclosing. We&apos;ll confirm
        receipt and keep you posted.
      </p>

      <h2>Something wrong with a marketplace item?</h2>
      <p>
        Packages and scripts in the Market tab are curated, but mistakes ship. Tell us which item and
        what it did — we can unpublish a broken item immediately, which stops it reaching anyone
        else. Copies already added to a Shelf are local to that machine and keep working, so delete
        yours and re-add the item once it&apos;s fixed.
      </p>

      <h2>Refunds and billing</h2>
      <p>
        sshwiz is free through the Phase 1 preview and there is nothing to bill. If and when paid
        Pro plans start, the terms and refund policy will be published here before anyone is
        charged.
      </p>

      <h2>Privacy</h2>
      <p>
        What sshwiz stores, what it sends and what we can see is set out in the{" "}
        <Link href={PRIVACY_PATH}>privacy policy</Link>. The short version: your credentials stay on
        your machine, and support mail only ever contains what you choose to put in it.
      </p>
    </LegalShell>
  );
}

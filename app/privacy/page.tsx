import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "../SiteChrome";
import { PRIVACY_PATH, PRIVACY_UPDATED, SUPPORT_EMAIL, SUPPORT_PATH } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy · sshwiz",
  description:
    "What sshwiz stores on your computer, what leaves it, and what we can see. Short version: your servers, your credentials, your machine.",
  alternates: { canonical: PRIVACY_PATH },
};

// Static: this is the Privacy Policy URL the store listings point at, so it
// must resolve independently of Firestore or any runtime data source.
export const dynamic = "force-static";

export default function PrivacyPage() {
  return (
    <LegalShell
      kicker="Privacy"
      title="Privacy policy"
      lede="sshwiz is a desktop app that talks to your servers directly. There is no relay, no account to create, and no copy of your infrastructure on our side. This page says exactly what that means."
      meta={`Last updated ${PRIVACY_UPDATED}`}
    >
      <h2>The short version</h2>
      <ul>
        <li>
          <b>You don&apos;t need an account to use sshwiz.</b> We don&apos;t know who you are.
        </li>
        <li>
          <b>Your SSH credentials never reach us.</b> They&apos;re stored encrypted on your machine
          and sent only to the servers you connect to.
        </li>
        <li>
          <b>No analytics, no telemetry, no tracking cookies in the app.</b> This website uses
          Google Analytics to count page views — details <a href="#website">below</a>.
        </li>
        <li>
          <b>We don&apos;t sell or share personal data</b>, because we don&apos;t collect it.
        </li>
      </ul>

      <h2>What sshwiz stores on your computer</h2>
      <p>
        Everything the app knows lives in your own operating-system user profile, and none of it is
        transmitted to us:
      </p>
      <ul>
        <li>
          <b>Connection profiles</b> — hostnames, usernames, ports, passwords and passphrases you
          choose to save. They&apos;re written to a local file encrypted with AES-256-GCM; the
          encryption key is held in your operating system&apos;s keychain, not in the file.
        </li>
        <li>
          <b>Private keys stay where they already are.</b> A key-file profile stores the path to the
          key, not the key itself.
        </li>
        <li>
          <b>Your Shelf</b> — the packages and scripts you added, including copies taken from the
          marketplace, plus any recipes you wrote yourself.
        </li>
        <li>
          <b>App settings and session history</b>, including the terminal output of commands you
          ran.
        </li>
      </ul>
      <p>
        Deleting the app&apos;s data directory removes all of it. Nothing is left on the servers you
        connected to either — sshwiz installs no agent and no daemon; it runs the same commands you
        would have typed.
      </p>

      <h3>Sudo and credential handling</h3>
      <p>
        When a command needs privileges, your sudo password is piped to <code>sudo -S</code> over
        stdin. It is never interpolated into a command line, so it never lands in shell history and
        is never visible to <code>ps</code> on the server.
      </p>

      <h2>What happens when the app fetches the marketplace</h2>
      <p>
        The Market tab reads the published catalog anonymously over HTTPS from Google Firestore.
        There&apos;s no login and no identifier attached to the request. As with any HTTPS request,
        the receiving infrastructure — Google Cloud, and this site&apos;s host when the JSON API is
        used — sees your IP address, timestamp and user agent, and records them in standard server
        logs under Google&apos;s own retention. We don&apos;t combine those logs with anything else,
        and they contain nothing about your servers: the request only asks &ldquo;what is
        published?&rdquo;
      </p>
      <p>
        Marketplace items you add are <b>copied</b> into your local Shelf. After that they work
        offline, and we have no way to tell what you added or ran.
      </p>

      <h2>The AI assist panel</h2>
      <p>
        AI features are opt-in and run on <b>your</b> provider account:
      </p>
      <ul>
        <li>
          Your API key is stored locally — in the app&apos;s own storage, or in your browser&apos;s
          <code>localStorage</code> in the admin portal. It is never written to the catalog or to
          any database of ours.
        </li>
        <li>
          Your prompt (the request you type, plus the item being drafted) is sent to the provider you
          configured — Anthropic, OpenAI, or any OpenAI-compatible endpoint, including a local Ollama
          instance, in which case nothing leaves your machine at all.
        </li>
        <li>
          Because browsers can&apos;t call those providers directly, the portal&apos;s requests pass
          through this site&apos;s <code>/api/ai</code> route. The key and the prompt are forwarded
          for that single request and are not stored or logged server-side.
        </li>
        <li>
          Whatever you send is then handled under <b>your provider&apos;s</b> privacy terms. Read
          theirs too.
        </li>
      </ul>

      <h2 id="website">This website</h2>
      <p>
        The public pages — the product page, this policy, the support page and the authoring guide —
        are static HTML served by Firebase App Hosting, whose infrastructure keeps standard request
        logs (IP address, timestamp, requested path).
      </p>
      <p>
        The site uses <b>Google Analytics 4</b> so we can see which pages are read and roughly where
        visitors come from. It sets first-party <code>_ga</code> cookies to tell repeat visits apart
        and sends the page URL, referrer, browser and device type, and a truncated IP address (used
        only to derive a coarse location, then discarded) to Google. Advertising features, Google
        Signals and ad personalisation are switched off, so nothing is used to build a profile of
        you or to show you ads, and none of it is linked to the desktop app, which sends no analytics
        at all. Google&apos;s handling of this data is described in its{" "}
        <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer">
          partner-sites notice
        </a>
        . To opt out, block <code>googletagmanager.com</code> in your browser or install
        Google&apos;s{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer">
          opt-out add-on
        </a>
        .
      </p>
      <p>
        The <b>admin portal</b> at <code>/admin</code> is for the marketplace&apos;s own
        maintainers. It uses Firebase Authentication, which stores the email address and password
        hash of admin accounts and sets a session cookie so you stay signed in. If you don&apos;t
        maintain the catalog, none of this applies to you.
      </p>
      <p>
        The public JSON API is rate limited per API key (identified by a hash of the key, kept in
        memory only) so one client can&apos;t exhaust it for everyone.
      </p>

      <h2>Who else sees your data</h2>
      <p>
        We use two processors, and only for the functions above: <b>Google</b> (Firestore for the
        catalog, Firebase Authentication for admin sign-in, App Hosting for this site, and Google
        Analytics for this site&apos;s page-view counts) and, if you turn on AI assist, <b>the AI
        provider you choose</b>. We don&apos;t sell personal data, we
        don&apos;t share it for advertising, and we don&apos;t run profiling. We would disclose data
        if legally compelled — but for app users, there is essentially nothing to disclose.
      </p>

      <h2>Your rights</h2>
      <p>
        If you&apos;re in the EU/EEA, the UK, or a US state with a privacy statute, you have rights
        to access, correct, export or delete personal data an organisation holds about you. For
        sshwiz app users, we hold none — the data described above sits on your own machine and you
        can delete it yourself at any time. If you&apos;ve emailed support, or you hold an admin
        account, write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we&apos;ll
        action the request; admin accounts and their mail threads are deleted on request.
      </p>

      <h2>Children</h2>
      <p>
        sshwiz is a system-administration tool for professional use and isn&apos;t directed at
        children under 13 (or under 16 in the EEA). We don&apos;t knowingly collect their data.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If the policy changes we update the date at the top of this page, and material changes are
        called out in the release notes for the version that introduces them.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy, or about anything the app does with data:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Other ways to reach us are on the{" "}
        <Link href={SUPPORT_PATH}>support page</Link>.
      </p>
    </LegalShell>
  );
}

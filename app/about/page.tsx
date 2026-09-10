import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "../SiteChrome";
import { ABOUT_PATH, ORG_NAME, SUPPORT_EMAIL, SUPPORT_PATH } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Who makes sshwiz, why it exists, and what it is and isn't. A small team at Higglerslab building a desktop app for setting up Linux servers over plain SSH.",
  alternates: { canonical: ABOUT_PATH },
  openGraph: { url: ABOUT_PATH, title: "About sshwiz" },
};

export const dynamic = "force-static";

export default function AboutPage() {
  return (
    <LegalShell
      kicker="About"
      title="A shelf for the servers you set up by hand."
      lede="sshwiz is built by Higglerslab, a small independent software studio. It exists because most servers are still set up by someone pasting commands from a gist, and that never stopped being error-prone."
    >
      <h2>What sshwiz is</h2>
      <p>
        A desktop app for macOS, Linux and Windows that connects to a Linux server over a normal SSH
        session and installs what you tick from a shelf: Docker, Nginx, Certbot, pinned Node.js and
        Python versions, and any recipe you or the community write. Every recipe is three steps —
        check, install, verify — and every command is listed before it runs.
      </p>

      <h2>What it isn&apos;t</h2>
      <p>
        It is not configuration management and does not try to be. If you rebuild a fleet from code,
        Ansible or Terraform remain the right tools. sshwiz is for the one to twenty servers a
        person sets up and looks after by hand — the ones that would otherwise be configured from
        memory.
      </p>

      <h2>Principles</h2>
      <ul>
        <li>
          <b>Nothing on the server.</b> No agent, no daemon, no relay. Uninstalling sshwiz changes
          nothing on the box.
        </li>
        <li>
          <b>Nothing runs unseen.</b> The install review lists every command, and every byte of
          output comes back to the terminal panel.
        </li>
        <li>
          <b>Your credentials stay yours.</b> Profiles live in an AES-256-GCM encrypted file on your
          machine, with the key in the OS keychain. We never see them — see the{" "}
          <Link href="/privacy">privacy policy</Link>.
        </li>
      </ul>

      <h2>Who makes it</h2>
      <p>
        {ORG_NAME} builds and supports sshwiz. During the Phase 1 preview the people who write the
        code also answer the support inbox — write to{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or see the{" "}
        <Link href={SUPPORT_PATH}>support page</Link> for what to include.
      </p>

      <h2>Contribute a recipe</h2>
      <p>
        The marketplace is open to community packages and scripts. The{" "}
        <Link href="/docs">authoring guide</Link> explains every field, and the marketplace itself is
        open source on{" "}
        <a href="https://github.com/vinmein/sshwiz-marketplace" rel="noopener noreferrer">
          GitHub
        </a>
        .
      </p>
    </LegalShell>
  );
}

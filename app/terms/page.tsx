import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "../SiteChrome";
import { ORG_NAME, PRIVACY_PATH, SUPPORT_EMAIL, TERMS_PATH, TERMS_UPDATED } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms for using the sshwiz desktop app, the recipe marketplace and this website during the Phase 1 preview.",
  alternates: { canonical: TERMS_PATH },
  openGraph: { url: TERMS_PATH, title: "Terms of service · sshwiz" },
};

export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <LegalShell
      kicker="Terms of service"
      title="The short, plain-English version — and the binding one."
      lede="These terms cover the sshwiz desktop app, the recipe marketplace and this website. By installing the app or using the marketplace you agree to them."
      meta={`Effective ${TERMS_UPDATED}`}
    >
      <h2>1. Who we are</h2>
      <p>
        sshwiz is made and operated by {ORG_NAME} (&quot;we&quot;, &quot;us&quot;). Questions about
        these terms go to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2>2. The preview</h2>
      <p>
        sshwiz is in a Phase 1 preview. It is provided free of charge for the duration of the
        preview, it may change, and features may be added, altered or removed without notice.
        Anything described as &quot;Pro&quot; or &quot;coming&quot; is a preview of intent, not a
        promise.
      </p>

      <h2>3. Your servers are your responsibility</h2>
      <p>
        sshwiz runs commands on servers you point it at, using credentials you supply, over an SSH
        session you open. The install review shows every command before it runs; it is your
        responsibility to read it, to make sure you are authorised to administer the server, and to
        keep backups. We do not have access to your servers and cannot undo what a recipe does.
      </p>

      <h2>4. Recipes and the marketplace</h2>
      <ul>
        <li>
          Recipes in the marketplace are contributed by us and by the community. We review what is
          published, but we do not guarantee that any recipe is correct, secure or suitable for your
          server. Read the commands first.
        </li>
        <li>
          By publishing a recipe you confirm you have the right to share it and you grant us and
          every sshwiz user a non-exclusive, royalty-free licence to use, copy, modify and
          redistribute it as part of the marketplace. Attribution is kept where the recipe carries
          it.
        </li>
        <li>
          Do not publish recipes that are malicious, that exfiltrate data, that hide what they do,
          or that infringe someone else&apos;s rights. We remove such recipes and revoke publishing
          access without notice.
        </li>
      </ul>

      <h2>5. The marketplace API</h2>
      <p>
        The published catalog is available as a read-only JSON API, keyed per client and rate
        limited. Keys are personal: do not share them or use them to bulk-scrape the catalog. We
        may revoke a key that is abused.
      </p>

      <h2>6. AI assist</h2>
      <p>
        The AI assist panel sends the prompts you type to the model provider you configure, using
        your own API key, and the provider&apos;s terms apply to that traffic. Generated recipes are
        drafts: review them before running them, exactly as you would a recipe from anyone else.
      </p>

      <h2>7. Acceptable use</h2>
      <p>
        Use sshwiz only on servers you own or are authorised to administer. Do not use it to attack,
        probe or disrupt systems that are not yours, to distribute malware, or to break the law.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The sshwiz app, name, logo and this website are ours. Your recipes remain yours, subject to
        the licence in section 4. The marketplace source code is published under its own open-source
        licence on GitHub, which governs that code.
      </p>

      <h2>9. No warranty</h2>
      <p>
        sshwiz is provided &quot;as is&quot; and &quot;as available&quot;, without warranty of any
        kind, express or implied, including fitness for a particular purpose and non-infringement.
        We do not warrant that it will be uninterrupted, error-free or that any recipe will work on
        any given server.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, {ORG_NAME} is not liable for any indirect,
        incidental, special or consequential damages, or for loss of data, revenue or servers,
        arising from your use of sshwiz, the marketplace or a recipe — even if we were advised of
        the possibility. Where liability cannot be excluded, it is limited to the amount you paid
        us for sshwiz in the twelve months before the claim, which during the preview is zero.
      </p>

      <h2>11. Privacy</h2>
      <p>
        What sshwiz stores, what leaves your machine and what we can see is described in the{" "}
        <Link href={PRIVACY_PATH}>privacy policy</Link>, which forms part of these terms.
      </p>

      <h2>12. Changes and termination</h2>
      <p>
        We may update these terms; the effective date at the top changes when we do, and continued
        use after that date is acceptance. You may stop using sshwiz at any time by uninstalling
        it — nothing remains on your servers. We may suspend marketplace or API access for a
        breach of these terms.
      </p>

      <h2>13. Governing law</h2>
      <p>
        These terms are governed by the laws of the jurisdiction in which {ORG_NAME} is
        established, and disputes are subject to the courts there, unless the consumer-protection
        law where you live gives you rights that cannot be waived.
      </p>
    </LegalShell>
  );
}

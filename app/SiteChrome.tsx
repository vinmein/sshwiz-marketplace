import Link from "next/link";
import s from "./landing.module.css";
import { ABOUT_PATH, PRIVACY_PATH, SUPPORT_EMAIL, SUPPORT_PATH, TERMS_PATH } from "@/lib/site";

/** The wordmark's chevron. Shared by the landing page and the legal pages. */
export function BrandGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 4.5 6 8l-3 3.5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 11.5H13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** Footer shared by every public page. Carries the Support and Privacy links
    that the store listings point at, plus About, Contact and Terms — the
    trust links crawlers look for — so they're reachable from anywhere. */
export function SiteFooter({ brandHref = "/" }: { brandHref?: string }) {
  return (
    <footer className={s.footer}>
      <div className={`${s.container} ${s.footerInner}`}>
        <a className={s.brand} href={brandHref}>
          <span className={s.brandMark}>
            <BrandGlyph />
          </span>
          sshwiz
        </a>
        <span>© {new Date().getFullYear()} sshwiz · made by Higglerslab</span>
        <div className={s.footerRight}>
          <Link href={ABOUT_PATH}>About</Link>
          <Link href={SUPPORT_PATH}>Support</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
          <Link href={PRIVACY_PATH}>Privacy</Link>
          <Link href={TERMS_PATH}>Terms</Link>
          <Link href="/docs">Authoring guide</Link>
          <Link href="/admin">Admin portal</Link>
        </div>
      </div>
    </footer>
  );
}

/**
 * Chrome for the standalone public pages (/support, /privacy). Reuses the
 * landing page's palette and nav so a store reviewer arriving cold lands on
 * something that plainly belongs to the same product.
 */
export default function LegalShell({
  kicker,
  title,
  lede,
  meta,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={s.page}>
      <nav className={s.nav}>
        <div className={`${s.container} ${s.navInner}`}>
          <Link className={s.brand} href="/">
            <span className={s.brandMark}>
              <BrandGlyph />
            </span>
            sshwiz
          </Link>
          <div className={s.navLinks}>
            <Link href={SUPPORT_PATH}>Support</Link>
            <Link href={PRIVACY_PATH}>Privacy</Link>
            <Link href="/docs">Authoring guide</Link>
          </div>
          <div className={s.navRight}>
            <Link
              className={`${s.btn} ${s.btnPrimary}`}
              href="/#download"
              style={{ padding: "9px 18px" }}
            >
              Download
            </Link>
          </div>
        </div>
      </nav>

      <main className={s.legal} id="main">
        <div className={s.container}>
          <p className={s.kicker}>{kicker}</p>
          <h1 className={s.legalTitle}>{title}</h1>
          <p className={s.legalLede}>{lede}</p>
          {meta && <p className={s.legalMeta}>{meta}</p>}
          <div className={s.prose}>{children}</div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

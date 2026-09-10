import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ORG_NAME, SAME_AS, SITE_NAME, SITE_URL, SUPPORT_EMAIL, SUPPORT_PATH } from "@/lib/site";
import GoogleAnalytics from "./GoogleAnalytics";
import JsonLd from "./JsonLd";

export const metadata: Metadata = {
  // Absolute base for canonical, Open Graph and sitemap URLs. Falls back to the
  // production origin when NEXT_PUBLIC_SITE_URL is unset (see lib/site.ts).
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} Marketplace Admin`,
    template: `%s · ${SITE_NAME}`,
  },
  description: "Manage the packages and scripts published to the sshwiz app.",
  applicationName: SITE_NAME,
  authors: [{ name: ORG_NAME, url: SITE_URL }],
  creator: ORG_NAME,
  publisher: ORG_NAME,
  // Defaults every page inherits; the landing page overrides title/description.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  // The web app manifest and icons are generated from app/manifest.ts,
  // app/icon.svg and app/apple-icon.tsx — Next links them automatically.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070c22",
  colorScheme: "light dark",
};

/** Organization + WebSite graph. Present on every page so crawlers and AI
    systems can attach the brand to whichever URL they land on. */
const organization = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: ORG_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/apple-icon` },
      email: SUPPORT_EMAIL,
      sameAs: SAME_AS,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SUPPORT_EMAIL,
        url: `${SITE_URL}${SUPPORT_PATH}`,
        availableLanguage: "en",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* GA4 is the only third-party origin; warm the connection early. */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <JsonLd data={organization} />
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}

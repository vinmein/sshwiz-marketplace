import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import GoogleAnalytics from "./GoogleAnalytics";

export const metadata: Metadata = {
  // Absolute base for the canonical URLs the public pages declare. Unset in
  // local dev, where Next falls back to relative ones.
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  title: "sshwiz Marketplace Admin",
  description: "Manage the packages and scripts published to the sshwiz app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}

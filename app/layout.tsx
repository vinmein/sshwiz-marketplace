import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sshwiz Marketplace Admin",
  description: "Manage the packages and scripts published to the sshwiz app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

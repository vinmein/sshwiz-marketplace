import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

/** Served at /manifest.webmanifest and linked from every page. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — set up a Linux server in a few clicks`,
    short_name: SITE_NAME,
    description:
      "A desktop cockpit for your servers: encrypted SSH profiles, one-click install recipes and a live terminal.",
    start_url: "/",
    display: "browser",
    background_color: "#070c22",
    theme_color: "#070c22",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

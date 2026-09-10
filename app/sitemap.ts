import type { MetadataRoute } from "next";
import {
  ABOUT_PATH,
  LANDING_UPDATED,
  PRIVACY_PATH,
  SITE_URL,
  SUPPORT_PATH,
  TERMS_PATH,
} from "@/lib/site";

/** Served at /sitemap.xml. Only the public, indexable pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(LANDING_UPDATED);
  return [
    { url: `${SITE_URL}/`, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/docs`, lastModified: updated, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}${ABOUT_PATH}`, lastModified: updated, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}${SUPPORT_PATH}`, lastModified: updated, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}${PRIVACY_PATH}`, lastModified: updated, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}${TERMS_PATH}`, lastModified: updated, changeFrequency: "yearly", priority: 0.3 },
  ];
}

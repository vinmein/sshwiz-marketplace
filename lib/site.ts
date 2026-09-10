// Public-facing site constants.
//
// The desktop app's store listings (Microsoft Store, Apple, and the download
// page itself) require a **Support URL** and a **Privacy Policy URL**, both
// mandatory and both of which must resolve. Both point at pages served by this
// app — `/support` and `/privacy` — so the paths below are part of the public
// contract: don't rename them without updating every store listing.

export const SUPPORT_PATH = "/support";
export const PRIVACY_PATH = "/privacy";

/** An env value that was never filled in reads as unset — apphosting.yaml
    ships `REPLACE_WITH_…` placeholders, and half-configured is worse than
    absent for anything a store reviewer sees. */
const configured = (v: string | undefined): string =>
  v && v.trim() !== "" && !v.startsWith("REPLACE_WITH") ? v.trim() : "";

/** Origin this site is served from, without a trailing slash. Set
    NEXT_PUBLIC_SITE_URL per environment (staging and production differ). It
    only feeds `metadataBase` and the absolute URLs pasted into store listings
    — the pages themselves link relatively and resolve without it. */
export const SITE_URL = (() => {
  const raw = configured(process.env.NEXT_PUBLIC_SITE_URL).replace(/\/+$/, "");
  if (raw === "") return "";
  try {
    const { protocol } = new URL(raw);
    return protocol === "http:" || protocol === "https:" ? raw : "";
  } catch {
    return "";
  }
})();

/** Where support mail lands. Override per environment with
    NEXT_PUBLIC_SUPPORT_EMAIL. */
export const SUPPORT_EMAIL =
  configured(process.env.NEXT_PUBLIC_SUPPORT_EMAIL) || "contact@higglerslab.com";

/** Vulnerability reports. Same inbox as support for now — the support page
    asks for a "Security:" subject prefix so they can still be triaged first.
    Point NEXT_PUBLIC_SECURITY_EMAIL at a dedicated address when one exists. */
export const SECURITY_EMAIL =
  configured(process.env.NEXT_PUBLIC_SECURITY_EMAIL) || SUPPORT_EMAIL;

/** Google Analytics 4 measurement ID (`G-XXXXXXXXXX`). Leave unset to ship
    without analytics — the tag is only rendered when this is configured, and
    the privacy policy describes what it collects. */
export const GA_MEASUREMENT_ID = (() => {
  const raw = configured(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
  return /^G-[A-Z0-9]+$/.test(raw) ? raw : "";
})();

/** Effective date shown on the privacy policy. Bump it whenever the policy
    text changes — store reviewers check that the page is dated. */
export const PRIVACY_UPDATED = "10 September 2026";

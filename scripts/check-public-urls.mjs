// Verify the URLs the desktop app's store listings depend on actually resolve.
//
//   npm run check-urls                      against http://localhost:3000
//   npm run check-urls -- https://staging…  against a deployed environment
//
// Store submissions require a Support URL and a Privacy Policy URL, both
// mandatory and both of which must load — a 404 (or a page that renders empty)
// fails review. Run this against staging before submitting, and after any
// deploy that touches routing.

// The first two are the store-listing URLs; the rest are what search engines
// and link previews fetch. Small files have a lower size floor.
const PATHS = ["/support", "/privacy", "/terms", "/about"];
const SMALL = ["/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/icon.svg", "/opengraph-image"];

const base = (process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000").replace(/\/+$/, "");

let failed = false;

for (const path of [...PATHS, ...SMALL]) {
  const url = `${base}${path}`;
  const floor = SMALL.includes(path) ? 20 : 500;
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    const body = await res.arrayBuffer();
    if (!res.ok) {
      console.error(`✘ ${url} — HTTP ${res.status}`);
      failed = true;
    } else if (body.byteLength < floor) {
      console.error(`✘ ${url} — HTTP 200 but the page is empty (${body.byteLength} bytes)`);
      failed = true;
    } else {
      console.log(`✔ ${url} — HTTP ${res.status}, ${body.byteLength} bytes`);
    }
  } catch (err) {
    console.error(`✘ ${url} — ${err?.message ?? err}`);
    failed = true;
  }
}

if (failed) {
  console.error(
    "\nOne or more required public URLs did not resolve. Both must return a real " +
      "page before the app can be submitted to a store.",
  );
  process.exit(1);
}

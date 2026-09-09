// Verify the URLs the desktop app's store listings depend on actually resolve.
//
//   npm run check-urls                      against http://localhost:3000
//   npm run check-urls -- https://staging…  against a deployed environment
//
// Store submissions require a Support URL and a Privacy Policy URL, both
// mandatory and both of which must load — a 404 (or a page that renders empty)
// fails review. Run this against staging before submitting, and after any
// deploy that touches routing.

const PATHS = ["/support", "/privacy"];

const base = (process.argv.slice(2).find((a) => !a.startsWith("--")) ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000").replace(/\/+$/, "");

let failed = false;

for (const path of PATHS) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    const body = await res.text();
    if (!res.ok) {
      console.error(`✘ ${url} — HTTP ${res.status}`);
      failed = true;
    } else if (body.length < 500) {
      console.error(`✘ ${url} — HTTP 200 but the page is empty (${body.length} bytes)`);
      failed = true;
    } else {
      console.log(`✔ ${url} — HTTP ${res.status}, ${body.length} bytes`);
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

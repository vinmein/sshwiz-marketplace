// Grant (or revoke) marketplace-admin access for a registered user.
//
//   npm run make-admin -- user@example.com            grant
//   npm run make-admin -- user@example.com --remove   revoke
//
// Runs with the Firebase Admin SDK, which bypasses Firestore rules — that's
// the point: the rules deny all client writes to `admins/`, so grants can
// only happen from the console or from here. Credentials, first match wins:
//   1. FB_SERVICE_ACCOUNT_B64 (env or .env.local) — base64 of the
//      service-account JSON: `base64 -i <key>.json | tr -d '\n'`
//   2. GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
//   3. `gcloud auth application-default login` (uses your Google account)
// The project ID comes from the service account, GOOGLE_CLOUD_PROJECT, or
// NEXT_PUBLIC_FB_PROJECT_ID in .env.local.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const args = process.argv.slice(2).filter((a) => a !== "--");
const remove = args.includes("--remove");
const email = args.find((a) => !a.startsWith("--"));

if (!email || !email.includes("@")) {
  console.error("Usage: npm run make-admin -- <email> [--remove]");
  process.exit(1);
}

/** KEY=VALUE lines from .env.local (comments and blanks skipped). */
function loadEnvLocal() {
  try {
    const file = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local"), "utf8");
    return Object.fromEntries(
      file
        .split("\n")
        .map((l) => l.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].trim()]),
    );
  } catch {
    return {};
  }
}

const envLocal = loadEnvLocal();
const b64 = process.env.FB_SERVICE_ACCOUNT_B64 ?? envLocal.FB_SERVICE_ACCOUNT_B64;

let credential;
let saProjectId;
if (b64) {
  let sa;
  try {
    sa = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch {
    console.error("FB_SERVICE_ACCOUNT_B64 is not valid base64-encoded JSON.");
    process.exit(1);
  }
  credential = cert(sa);
  saProjectId = sa.project_id;
} else {
  credential = applicationDefault();
}

const projectId =
  saProjectId ?? process.env.GOOGLE_CLOUD_PROJECT ?? envLocal.NEXT_PUBLIC_FB_PROJECT_ID;
if (!projectId) {
  console.error(
    "No project ID found. Set FB_SERVICE_ACCOUNT_B64 or NEXT_PUBLIC_FB_PROJECT_ID " +
      "in .env.local, or run with GOOGLE_CLOUD_PROJECT=<project-id>.",
  );
  process.exit(1);
}

initializeApp({ credential, projectId });

try {
  const user = await getAuth().getUserByEmail(email);
  const ref = getFirestore().collection("admins").doc(user.uid);
  if (remove) {
    await ref.delete();
    console.log(`✔ Revoked admin access for ${email} (uid ${user.uid}).`);
  } else {
    await ref.set({ email: user.email, grantedAt: FieldValue.serverTimestamp() });
    console.log(`✔ ${email} (uid ${user.uid}) is now a marketplace admin.`);
  }
} catch (err) {
  if (err?.code === "auth/user-not-found") {
    console.error(
      `No Firebase Auth user with email ${email}. They need to create an account ` +
        "first — on the portal's /register page, or in the console under Authentication → Users.",
    );
  } else if (err?.message?.includes("Could not load the default credentials")) {
    console.error(
      "No Google credentials found. Set FB_SERVICE_ACCOUNT_B64 in .env.local " +
        "(base64 of a service-account JSON: `base64 -i <key>.json | tr -d '\\n'`), or set " +
        "GOOGLE_APPLICATION_CREDENTIALS to the JSON path, or run " +
        "`gcloud auth application-default login`. Keys come from Firebase console → " +
        "Project settings → Service accounts → Generate new private key.",
    );
  } else {
    console.error(err?.message ?? err);
  }
  process.exit(1);
}

# sshwiz Marketplace

The marketplace behind sshwiz's **Market** tab: a Next.js admin portal for
managing packages and scripts, plus the public JSON API that serves them.
Content lives in Firebase Firestore; admins sign in with Firebase
Authentication; the app deploys to Firebase App Hosting. This is a standalone
project — the sshwiz desktop app lives in the `boxmanager` repo.

Setting things up is covered below; **how to write good packages and scripts**
is covered in [AUTHORING.md](AUTHORING.md).

The dashboard's **🤖 AI agent** tab drafts packages and scripts from a plain
English request (same prompts as the desktop app). Bring your own key via its
⚙️ AI settings — Anthropic, OpenAI, or any OpenAI-compatible endpoint. The key
lives in the admin's browser localStorage (never Firestore); requests pass
through this app's `/api/ai` route because browsers can't call providers
directly. Generated items always save as unpublished drafts for review.

How the pieces fit:

- **Portal (this app)** — authenticated CRUD for `packages` and `scripts`
  collections, with a publish toggle per item.
- **Firestore** — the storage. Security rules (`firestore.rules`) let anyone
  read *published* items and let only allowlisted admins write.
- **sshwiz desktop app** — reads published items anonymously over Firestore's
  REST API (`src/marketplace.ts`), no Firebase SDK involved. Users copy items
  into their local Shelf, so installed content works offline.

## One-time Firebase setup

1. Create a Firebase project at <https://console.firebase.google.com>.
2. **Firestore**: create a database (production mode).
3. **Authentication**: enable the **Email/Password** provider. Accounts can
   then be created on the portal's `/register` page (or manually under
   Authentication → Users) — but an account alone grants nothing until step 5.
4. **Web app**: Project settings → General → Your apps → add a Web app; copy
   the config values.
5. **Admin allowlist**: each admin needs a document in the `admins` collection
   whose **ID is their Auth UID**. Easiest way — after the person has an
   account (portal `/register` page, or Authentication → Users):

   ```bash
   npm run make-admin -- user@example.com
   ```

   Credentials for the script (first match wins): `FB_SERVICE_ACCOUNT_B64`
   in `.env.local` (base64 of a service-account key:
   `base64 -i <key>.json | tr -d '\n'`), or
   `GOOGLE_APPLICATION_CREDENTIALS=<path>.json`, or
   `gcloud auth application-default login`. The service-account key is a
   secret: `.env.local` and `*-firebase-adminsdk-*.json` are gitignored —
   never commit either.

   `--remove` revokes. Or create the doc by hand in the Firestore console
   (any content, e.g. `{ email: "…" }`). Client writes to `admins/` are
   denied by the rules, so this is the only way in — by design.

## Deploy the security rules

```bash
npm i -g firebase-tools
firebase login
firebase use <your-project-id>
firebase deploy --only firestore:rules
```

## Run the portal locally

```bash
cp .env.local.example .env.local   # fill in the web-app config from step 4
npm install
npm run dev                        # http://localhost:3000
```

## Deploy the portal to App Hosting

App Hosting builds from a connected Git repository:

1. Fill in the real values in `apphosting.yaml` (they replace the
   `REPLACE_WITH_…` placeholders; these are public web config, not secrets).
2. In the Firebase console → **App Hosting** → *Get started*, connect this
   GitHub repository and pick the live branch. Every push then builds and
   deploys automatically.

   Or from the CLI: `firebase apphosting:backends:create --project <id>` and
   follow the prompts.

## Point the desktop app at the marketplace

In the sshwiz app repo (`boxmanager`), set the Vite env vars (e.g. in
`.env.local`, or in `.env.staging` / `.env.production` for release builds):

```
VITE_MARKETPLACE_PROJECT_ID=<your-project-id>
VITE_MARKETPLACE_API_KEY=<the web API key>
```

Rebuild the app; the Shelf's **Market** tab now lists everything published.

## Public marketplace API

The portal also exposes the **published** catalog as a read-only JSON API —
no auth, CORS-open, CDN-cached for 60s. Drafts can never leak: the server
reads Firestore anonymously, and the security rules only permit the
published-only query.

```
GET /api/marketplace                      → { packages: […], scripts: […] }
GET /api/marketplace/packages             → { packages: […] }
GET /api/marketplace/packages?family=ubuntu   (ubuntu | rhel | alpine)
GET /api/marketplace/scripts              → { scripts: […] }
GET /api/marketplace/packages/{id}        → one package, 404 if draft/missing
GET /api/marketplace/scripts/{id}         → one script,  404 if draft/missing
```

Example:

```bash
curl https://<your-app-hosting-domain>/api/marketplace/packages?family=ubuntu
```

Item shapes match the data model below, plus `id` and `updatedAt`, minus
`published` (everything served is published by definition).

## Data model

`packages/{id}`:

```
name, description, category, icon: string
recipes: { ubuntu? | rhel? | alpine?: { check: string[], install: string[], verify: string[] } }
published: boolean
```

`scripts/{id}`:

```
name, description, icon, body: string
params: [{ key, shellVar, label, placeholder?, default?, required?, secret?, type?: "select", options?: [{value, label}] }]
published: boolean
```

Keep field names in sync with the desktop app's decoder
(`src/marketplace.ts` in the `boxmanager` repo).

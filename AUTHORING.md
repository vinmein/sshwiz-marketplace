# Authoring marketplace packages and scripts

How to create, test, and publish content from the admin portal, and exactly
what each field does when it reaches the sshwiz app. (Portal setup and
deployment are covered in the repo's `README.md`.)

## Lifecycle

Everything you create starts as a **Draft** — invisible to the app. Click
**Publish** when it's ready; the app's Market tab lists only published items.
Users **copy** an item into their local Shelf with "Add", where it behaves
like any custom entry: it works offline and they can edit or delete their
copy. That has one important consequence:

> **Publishing an update does not change copies users already added.** The
> app marks an already-added item "✓ Added" and won't re-add it. To pick up
> your update, a user deletes their local copy and adds the item again. So
> treat published content as append-mostly: get it right before publishing,
> and prefer a new item (or a clear description bump) for breaking changes.

## Creating a package

A package is an install recipe: sshwiz runs **check**, then **install**, then
**verify** over SSH on the target server.

Open **📦 Packages → ＋ New package**.

| Field | What it does |
| --- | --- |
| **Name** | Shown on the package tile in the app. |
| **Icon** | One emoji, shown on the tile. |
| **Category** | Grouping label shown under the name (e.g. `Databases`, `Web`). |
| **Document ID** | The Firestore doc ID, auto-slugged from the name. Fixed after creation — it also becomes the ID of users' local copies, so changing it later would create a "different" item. |
| **Description** | One sentence under the tile. Say what's installed and from where (distro repo? vendor repo?). |

Then pick the **Distro family** and fill in one set of commands, like the
desktop app's editor:

- **All (same commands)** writes the identical commands to every family —
  use it when the commands genuinely don't differ.
- A specific family (**Ubuntu / Debian**, **RHEL / Fedora**, **Alpine**)
  saves the commands for that family only. When editing a package that
  already has other families, those stay untouched — switch the selector to
  edit each one in turn.
- If a user's server matches a family the package doesn't cover, the app
  falls back to the Ubuntu recipe, so provide that one at minimum.

Each box takes **one command per line**, run in order:

- **Check** — decides whether install is needed. Exit 0 = already installed,
  install is skipped. `command -v redis-server` is the usual pattern.
- **Install** — the actual installation. Commands must be non-interactive:
  use `-y` flags, and on Debian/Ubuntu prefix apt installs with
  `sudo DEBIAN_FRONTEND=noninteractive apt-get install -y …`. Use `sudo` on
  anything privileged — the app feeds the user's sudo password over stdin
  automatically.
- **Verify** — proves it worked, e.g. `redis-server --version`. A non-zero
  exit marks the install failed, so keep it honest but simple.

### Worked example — Redis (Ubuntu)

- Name `Redis`, icon `🟥`, category `Databases`, description
  `In-memory data store (distro packages).`
- Distro family `Ubuntu / Debian`; check `command -v redis-server`; install
  `sudo apt-get update` and
  `sudo DEBIAN_FRONTEND=noninteractive apt-get install -y redis-server`;
  verify `redis-server --version`.

Save, then Publish. To cover another distribution, either edit the same
package and switch the family selector (one item, per-family recipes), or
create a separate item per distro (e.g. doc IDs `redis-ubuntu`,
`redis-alpine`) — the AI agent suggests suffixed IDs like that automatically
when a family is selected.

## Creating a script

A script is a reusable, parameterized shell task: the user fills in your
inputs, reviews the composed script, and runs it over SSH.

Open **📜 Scripts → ＋ New script**.

Top fields (Name, Icon, Description, Document ID) work as for packages.

### Inputs

Each input renders as a form field in the app and is injected into the script
as a shell variable, safely single-quoted. Per input:

| Field | What it does |
| --- | --- |
| **Shell variable** | UPPER_SNAKE_CASE name; reference it in the body as `$VAR`. Anything else is normalized (`db name` → `DB_NAME`). |
| **Label** | The form field's caption in the app. |
| **Placeholder** | Example text shown in the empty field. |
| **Default** | Pre-filled value. |
| **Choices** | Optional; one `value\|Label` per line turns the input into a dropdown (e.g. `yes\|Yes — NOPASSWD:ALL`). Leave empty for free text. |
| **Required** | The app blocks Run until it's filled. |
| **Secret** | Masked input, and redacted as `••••••••` in the script preview. The app also auto-treats names like `PASSWORD`/`TOKEN` as secret, but set the flag explicitly — don't rely on the heuristic. |

### Body

The app prepends `set -e` and your input assignments, then runs the whole
body as one bash script (via `sudo bash` when it contains `sudo`, with the
password primed over stdin — never prompt for it yourself).

Rules of thumb, learned the hard way:

- **One command per line.** `set -e` does *not* stop the script when the
  left side of an `a && b` chain fails — the chain short-circuits and the
  script keeps going, so a trailing `echo "done"` can report success after a
  failure. Sequential lines abort correctly.
- **Quote your variables**: `"$TARGET_DIR"`, not `$TARGET_DIR`.
- **Reference only declared inputs.** The editor warns when the body uses
  `$SOMETHING` no input declares — fix it before saving (the app can't
  supply an undeclared variable, and `set -e` won't catch the empty
  expansion).
- **Never print or inline secrets.** Feed them via stdin:
  `echo "$DB_USER:$DB_PASSWORD" | sudo chpasswd` is fine (piped), while
  `echo $DB_PASSWORD` or `--password=$DB_PASSWORD` gets flagged by the app
  as a secret leak (visible in output or `ps`).
- **Destructive patterns** (`rm -rf`, `dd of=/dev/…`, `mkfs`, firewall
  flushes…) make the app show a warning banner before the user runs the
  script. Sometimes that's the job — just make sure the description says so.
- End with an honest status `echo` — it only runs if everything above
  succeeded (given one command per line).

### Worked example — Create sudo user

Inputs:

1. `NEW_USER`, label `Username`, placeholder `deploy`, required.
2. `PUBKEY`, label `SSH public key`, placeholder `ssh-ed25519 AAAA…`.
3. `NOPASSWD`, label `Passwordless sudo`, default `no`, choices
   `no|No — require password` and `yes|Yes — NOPASSWD:ALL`.

Body:

```bash
if id "$NEW_USER" >/dev/null 2>&1; then
    echo "User $NEW_USER already exists." >&2
    exit 1
fi

sudo useradd -m -s /bin/bash "$NEW_USER"
sudo usermod -aG sudo "$NEW_USER"

if [ -n "$PUBKEY" ]; then
    sudo mkdir -p "/home/$NEW_USER/.ssh"
    echo "$PUBKEY" | sudo tee "/home/$NEW_USER/.ssh/authorized_keys" > /dev/null
    sudo chmod 700 "/home/$NEW_USER/.ssh"
    sudo chmod 600 "/home/$NEW_USER/.ssh/authorized_keys"
    sudo chown -R "$NEW_USER:$NEW_USER" "/home/$NEW_USER/.ssh"
fi

if [ "$NOPASSWD" = "yes" ]; then
    echo "$NEW_USER ALL=(ALL) NOPASSWD:ALL" | sudo tee "/etc/sudoers.d/90-$NEW_USER" > /dev/null
    sudo chmod 440 "/etc/sudoers.d/90-$NEW_USER"
fi

echo "Created sudo user $NEW_USER"
```

## Testing before (and after) publishing

1. Publish to a **staging** Firebase project first if you run one; otherwise
   publish, verify quickly, and unpublish if something's off.
2. In sshwiz, open **Shelf → 🛒 Market → Refresh**, add your item, and read
   the composed preview ("Show script preview") — this is exactly what users
   review.
3. Run it against a disposable server (a fresh VM or container) for each
   distro family you claim to support.
4. Remember the update caveat at the top: your own added copy also won't
   refresh — delete it from the Shelf and re-add after each published change.

## Editing, unpublishing, deleting

- **Edit** changes the stored item; it reaches only *future* adds.
- **Unpublish** hides an item from the app without deleting it — the fastest
  brake if something shipped broken. Users' existing copies keep working.
- **Delete** is permanent (the portal asks for confirmation). Existing local
  copies survive, since they're copies.

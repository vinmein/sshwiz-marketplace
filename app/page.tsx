import type { Metadata } from "next";
import Link from "next/link";
import s from "./landing.module.css";

export const metadata: Metadata = {
  title: "sshwiz — set up a Linux server in a few clicks",
  description:
    "A desktop cockpit for your servers: encrypted SSH profiles, one-click install recipes for Docker, Nginx, Node and friends, parameterised scripts, and a live terminal that shows every command before it runs.",
};

/**
 * Public product page. Rendered as a server component with no client JS — the
 * app screenshot below is a hand-built HTML/CSS replica of the real UI, so the
 * page stays sharp on every display and costs nothing to load.
 *
 * TODO: point these at the real release artefacts once builds are published.
 */
const DOWNLOADS = {
  mac: "#download",
  linux: "#download",
  windows: "#download",
};

export default function LandingPage() {
  return (
    <div className={s.page}>
      <Nav />

      <header className={s.hero}>
        <div className={s.container}>
          <span className={s.eyebrow}>
            <b>New</b> Phase 1 preview — the Shelf, Market and AI assist are live
          </span>

          <h1 className={s.h1}>
            SSH in. Click.
            <br />
            <em>It&apos;s installed.</em>
          </h1>

          <p className={s.lede}>
            sshwiz turns server setup into a shelf you pick from. Save an encrypted profile, choose
            Docker, Nginx, Certbot or a pinned Node version, read the exact commands it&apos;s about
            to run — then watch them stream back in a live terminal. No copy-pasted gist, no
            half-remembered <code>apt</code> incantation.
          </p>

          <div className={s.ctaRow}>
            <a className={`${s.btn} ${s.btnPrimary}`} href="#download">
              Download sshwiz
            </a>
            <a className={`${s.btn} ${s.btnGhost}`} href="#shelf">
              See how the Shelf works
            </a>
          </div>

          <p className={s.microNote}>
            Free during the Phase 1 preview · macOS, Linux and Windows · your keys never leave your
            machine
          </p>

          <AppShot />

          <div className={s.strip}>
            <span>
              <b>Ubuntu / Debian</b>
            </span>
            <span>
              <b>RHEL / Fedora</b>
            </span>
            <span>
              <b>Alpine</b>
            </span>
            <span>Recipes are written per distro family — one card, three package managers.</span>
          </div>
        </div>
      </header>

      <Features />
      <HowItWorks />
      <Shelf />
      <AiSection />
      <Security />
      <Pro />
      <Faq />
      <Download />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ nav -- */

function Nav() {
  return (
    <nav className={s.nav}>
      <div className={`${s.container} ${s.navInner}`}>
        <a className={s.brand} href="#top">
          <span className={s.brandMark}>
            <BrandGlyph />
          </span>
          sshwiz
        </a>
        <div className={s.navLinks}>
          <a href="#features">Features</a>
          <a href="#shelf">Shelf</a>
          <a href="#marketplace">Marketplace</a>
          <a href="#security">Security</a>
          <a href="#pro">Pro</a>
        </div>
        <div className={s.navRight}>
          <Link className={s.quiet} href="/docs">
            Authoring guide
          </Link>
          <a className={`${s.btn} ${s.btnPrimary}`} href="#download" style={{ padding: "9px 18px" }}>
            Download
          </a>
        </div>
      </div>
    </nav>
  );
}

function BrandGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 4.5 6 8l-3 3.5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 11.5H13" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------- the app shot -- */

const SHOT_PACKAGES: { icon: string; name: string; cat: string; desc: string }[] = [
  {
    icon: "🐳",
    name: "Docker",
    cat: "Containers",
    desc: "Container runtime and CLI from Docker's official apt repository, including Buildx and Compose plugins.",
  },
  {
    icon: "🟩",
    name: "Node.js (specific version)",
    cat: "Runtime",
    desc: "Installs a pinned major of Node.js (20.x by default) with npm from the official NodeSource repository.",
  },
  {
    icon: "🔐",
    name: "Certbot",
    cat: "Security",
    desc: "The Let's Encrypt ACME client for obtaining and automatically renewing free TLS certificates.",
  },
  {
    icon: "🌐",
    name: "Nginx",
    cat: "Web",
    desc: "High-performance web server and reverse proxy.",
  },
];

function AppShot() {
  return (
    <div className={s.shot}>
      <div className={s.shotInner}>
        <div className={s.appBar}>
          <div className={s.dots}>
            <span className={s.dot} style={{ background: "#ff5f57" }} />
            <span className={s.dot} style={{ background: "#febc2e" }} />
            <span className={s.dot} style={{ background: "#28c840" }} />
          </div>
          <span className={s.appTitle}>sshwiz</span>
          <span className={s.appTag}>Phase 1 prototype</span>
        </div>

        <div className={s.appBody}>
          <aside className={s.rail}>
            {["VA", "GE", "MA"].map((initials) => (
              <span className={s.avatar} key={initials}>
                <span>{initials}</span>
              </span>
            ))}
            <span className={`${s.avatar} ${s.avatarAdd}`}>
              <span>+</span>
            </span>
          </aside>

          <aside className={s.side}>
            <p className={s.sideTitle}>New profile</p>
            <p className={s.label}>Profile name</p>
            <div className={s.input}>Staging box</div>
            <p className={s.label}>Host</p>
            <div className={`${s.input} ${s.inputMono}`}>203.0.113.10</div>
            <p className={s.label}>Username</p>
            <div className={`${s.input} ${s.inputMono}`}>ubuntu</div>
            <p className={s.label}>Authentication</p>
            <div className={s.seg}>
              <span className={`${s.segItem} ${s.segOn}`}>Key file</span>
              <span className={s.segItem}>Password</span>
              <span className={s.segItem}>Paste key</span>
            </div>
            <p className={s.label}>Private key path</p>
            <div className={`${s.input} ${s.inputMono}`}>~/.ssh/id_ed25519</div>
            <div className={`${s.sideBtn} ${s.sideBtnStrong}`}>Connect</div>
            <div className={s.sideBtn}>Import from ~/.ssh/config</div>
          </aside>

          <section className={s.mainPane}>
            <div className={s.tabs}>
              <span className={`${s.tab} ${s.tabOn}`}>📦 Shelf</span>
              <span className={s.tab}>📊 Dashboard</span>
              <span className={s.tab}>⚙️ Services</span>
              <span className={`${s.tab} ${s.tabDim}`}>
                🐳 Docker <b className={s.proTag}>PRO</b>
              </span>
              <span className={`${s.tab} ${s.tabDim}`}>
                📋 Logs <b className={s.proTag}>PRO</b>
              </span>
              <span className={`${s.tab} ${s.tabDim}`}>
                🛡 Security <b className={s.proTag}>PRO</b>
              </span>
            </div>

            <div className={s.cards}>
              {SHOT_PACKAGES.map((p) => (
                <article className={s.pkg} key={p.name}>
                  <span className={s.pkgBadge}>{"{ }"}</span>
                  <div className={s.pkgHead}>
                    <span className={s.pkgIcon}>{p.icon}</span>
                    <div>
                      <div className={s.pkgName}>{p.name}</div>
                      <div className={s.pkgCat}>{p.cat}</div>
                    </div>
                  </div>
                  <p className={s.pkgDesc}>{p.desc}</p>
                </article>
              ))}
              <article className={`${s.pkg} ${s.pkgDashed}`}>
                <div className={s.pkgHead}>
                  <span className={s.pkgIcon}>➕</span>
                  <div>
                    <div className={s.pkgName}>Custom recipe</div>
                    <div className={s.pkgCat}>Your own shelf item</div>
                  </div>
                </div>
                <p className={s.pkgDesc}>Define check / install / verify once and reuse it anywhere.</p>
              </article>
              <article className={`${s.pkg} ${s.pkgDashed}`}>
                <div className={s.pkgHead}>
                  <span className={s.pkgIcon}>📥</span>
                  <div>
                    <div className={s.pkgName}>Import JSON</div>
                    <div className={s.pkgCat}>Paste an exported entry</div>
                  </div>
                </div>
                <p className={s.pkgDesc}>Share recipes with the team using the {"{ }"} badge on any card.</p>
              </article>
            </div>

            <div className={s.review}>
              <div className={s.reviewHead}>Install review · 9 commands</div>
              <div className={s.reviewBox}>
                <b>$</b> curl -fsSL https://download.docker.com/linux/ubuntu/gpg | …
                <br />
                <b>$</b> sudo apt-get install -y docker-ce docker-compose-plugin
                <br />
                <b>$</b> docker --version
              </div>
              <div className={s.reviewBtns}>
                <span className={s.installBtn}>Install</span>
                <span className={s.targetsBtn}>Targets · 3 servers</span>
              </div>
            </div>
          </section>

          <aside className={s.term}>
            <div className={s.termHead}>
              <span className={s.pulse} />
              Terminal
            </div>
            <div className={s.termBody}>
              <span className={s.dim}>ubuntu@staging:~$ </span>
              <span className={s.cmd}>docker --version</span>
              {"\n"}Docker version 27.3.1, build ce12230
              {"\n"}
              {"\n"}
              <span className={s.ok}>✓ check</span> docker not present
              {"\n"}
              <span className={s.ok}>✓ install</span> 9/9 commands ok
              {"\n"}
              <span className={s.ok}>✓ verify</span> daemon responding
              {"\n"}
              {"\n"}
              <span className={s.dim}>ubuntu@staging:~$ </span>
              <span className={s.caret} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- features -- */

const FEATURES = [
  {
    icon: "🔐",
    title: "Profiles that stay yours",
    body: (
      <>
        Hosts, keys and passphrases live in a single AES-256-GCM file on your machine, with the
        encryption key held in the OS keychain. The profile stores the <em>path</em> to your key, not
        a copy of it — and <code>~/.ssh/config</code> imports in one click.
      </>
    ),
  },
  {
    icon: "📦",
    title: "A shelf, not a wiki page",
    body: (
      <>
        Docker, Nginx, Certbot, MongoDB, git, pinned Node.js and Python versions. Every recipe is
        the same three steps — <code>check</code>, <code>install</code>, <code>verify</code> — so a
        second run is a no-op instead of a disaster.
      </>
    ),
  },
  {
    icon: "🧾",
    title: "Read it before it runs",
    body: (
      <>
        The install review lists every command, in order, for the exact box you&apos;re pointed at.
        Nothing touches the server until you press Install — then the output streams back live.
      </>
    ),
  },
  {
    icon: "🎯",
    title: "One click, whole fleet",
    body: (
      <>
        Pick your targets and send the same shelf to every server you&apos;ve saved. Staging and
        production stop drifting apart because they were built from the same list.
      </>
    ),
  },
  {
    icon: "📜",
    title: "Scripts with real inputs",
    body: (
      <>
        Turn a shell script into a form: labelled fields, selects, defaults, and secret values that
        arrive as shell variables instead of sitting in your history.
      </>
    ),
  },
  {
    icon: "🛒",
    title: "A marketplace of recipes",
    body: (
      <>
        The Market tab lists everything published to the catalog. Copy an item into your local Shelf
        and it keeps working offline — installed content is yours, not a remote lookup.
      </>
    ),
  },
];

function Features() {
  return (
    <section className={s.section} id="features">
      <div className={s.container}>
        <div className={`${s.sectionHead} ${s.centered}`}>
          <p className={s.kicker}>What you get</p>
          <h2 className={s.h2}>Everything between “fresh VPS” and “it&apos;s running”</h2>
          <p className={s.sub}>
            The boring, error-prone middle of server setup — done once, properly, and reusable.
          </p>
        </div>
        <div className={s.grid3}>
          {FEATURES.map((f) => (
            <article className={s.card} key={f.title}>
              <span className={s.cardIcon}>{f.icon}</span>
              <h3 className={s.cardTitle}>{f.title}</h3>
              <p className={s.cardBody}>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- how it works -- */

function HowItWorks() {
  const steps = [
    {
      title: "Connect",
      body: (
        <>
          Add a profile — key file, password or a pasted key — or import your whole{" "}
          <code>~/.ssh/config</code>. The sudo password is optional, and when you set one it&apos;s
          fed over stdin, never on a command line where <code>ps</code> could read it.
        </>
      ),
    },
    {
      title: "Fill the shelf",
      body: (
        <>
          Tick the packages and scripts you want. Pull more from the Market tab, write your own with
          Custom recipe, or paste one a teammate exported as JSON.
        </>
      ),
    },
    {
      title: "Install and watch",
      body: (
        <>
          Read the install review, choose your targets, press Install. Every line of output — checks,
          installs, verifications — streams into the terminal panel as it happens.
        </>
      ),
    },
  ];

  return (
    <section className={s.section}>
      <div className={s.container}>
        <div className={`${s.sectionHead} ${s.centered}`}>
          <p className={s.kicker}>How it works</p>
          <h2 className={s.h2}>Three steps, and none of them are “paste this into your shell”</h2>
        </div>
        <div className={s.steps}>
          {steps.map((step, i) => (
            <article className={s.step} key={step.title}>
              <span className={s.stepNum}>{i + 1}</span>
              <h3 className={s.cardTitle}>{step.title}</h3>
              <p className={s.cardBody}>{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- shelf -- */

function Shelf() {
  return (
    <section className={s.section} id="shelf">
      <div className={s.container}>
        <div className={s.split}>
          <div>
            <p className={s.kicker}>The shelf</p>
            <h2 className={s.h2}>One card. Every package manager.</h2>
            <p className={s.sub}>
              A recipe carries a separate command list per distro family, so the card you click is
              the same whether the box underneath is Ubuntu, Fedora or Alpine.
            </p>
            <ul className={s.list}>
              <li>
                <b>check</b> — is it already there? Skip the work instead of fighting it.
              </li>
              <li>
                <b>install</b> — the real commands, from official repositories, in order.
              </li>
              <li>
                <b>verify</b> — prove it actually came up before you call it done.
              </li>
              <li>
                <b>{"{ }"} export</b> — every card round-trips to JSON for sharing and review.
              </li>
            </ul>
          </div>
          <div className={s.code}>
            <div className={s.codeBar}>docker · recipes.ubuntu</div>
            <pre>
              <code>
                {`{
  `}
                <span className={s.k}>&quot;check&quot;</span>
                {`:   [`}
                <span className={s.s}>&quot;command -v docker&quot;</span>
                {`],
  `}
                <span className={s.k}>&quot;install&quot;</span>
                {`: [
    `}
                <span className={s.s}>&quot;sudo install -m 0755 -d /etc/apt/keyrings&quot;</span>
                {`,
    `}
                <span className={s.s}>&quot;sudo apt-get update -y&quot;</span>
                {`,
    `}
                <span className={s.s}>&quot;sudo apt-get install -y docker-ce …&quot;</span>
                {`
  ],
  `}
                <span className={s.k}>&quot;verify&quot;</span>
                {`:  [`}
                <span className={s.s}>&quot;docker --version&quot;</span>
                {`]
}`}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ AI --- */

function AiSection() {
  return (
    <section className={s.section} id="marketplace">
      <div className={s.container}>
        <div className={s.split}>
          <div className={s.code}>
            <div className={s.codeBar}>curl · the published catalog</div>
            <pre>
              <code>
                <span className={s.c}>{"# everything published, as JSON\n"}</span>
                {'curl -H "Authorization: Bearer $SSHWIZ_KEY" \\\n  '}
                <span className={s.s}>https://sshwiz.app/api/marketplace</span>
                {"\n\n"}
                <span className={s.c}>{"# just the Ubuntu/Debian packages\n"}</span>
                {'curl -H "Authorization: Bearer $SSHWIZ_KEY" \\\n  '}
                <span className={s.s}>
                  https://sshwiz.app/api/marketplace/packages?family=ubuntu
                </span>
                {"\n\n"}
                <span className={s.c}>{"# one script by id\n"}</span>
                {'curl -H "Authorization: Bearer $SSHWIZ_KEY" \\\n  '}
                <span className={s.s}>https://sshwiz.app/api/marketplace/scripts/harden-ssh</span>
              </code>
            </pre>
          </div>
          <div>
            <p className={s.kicker}>Marketplace &amp; AI assist</p>
            <h2 className={s.h2}>Describe it in English. Get a recipe.</h2>
            <p className={s.sub}>
              The AI assist panel&apos;s Recipe mode drafts the check / install / verify commands for
              whatever you ask for, per distro family, ready to review and edit before it ever runs.
            </p>
            <ul className={s.list}>
              <li>
                <b>Bring your own key</b> — Anthropic, OpenAI, or any OpenAI-compatible endpoint,
                including a local Ollama at <code>localhost:11434</code>.
              </li>
              <li>
                <b>Your key stays local.</b> It lives in your own storage, never in the catalog.
              </li>
              <li>
                <b>Drafts stay drafts.</b> Generated items save unpublished until a human reviews
                them.
              </li>
              <li>
                <b>Scriptable catalog.</b> The published shelf is also a read-only JSON API, keyed
                per client and rate limited — point your own tooling at it.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ security --- */

function Security() {
  return (
    <section className={s.section} id="security">
      <div className={s.container}>
        <div className={`${s.sectionHead} ${s.centered}`}>
          <p className={s.kicker}>Trust</p>
          <h2 className={s.h2}>Your servers, your credentials, your machine</h2>
          <p className={s.sub}>
            sshwiz is a desktop app that speaks SSH directly. There is no relay, no agent to install
            on the server, and nothing to sync.
          </p>
        </div>
        <div className={s.grid3}>
          <article className={s.card}>
            <span className={s.cardIcon}>🗝</span>
            <h3 className={s.cardTitle}>Encrypted at rest</h3>
            <p className={s.cardBody}>
              Profiles are stored in a local AES-256-GCM file. The encryption key never leaves the OS
              keychain.
            </p>
          </article>
          <article className={s.card}>
            <span className={s.cardIcon}>🤫</span>
            <h3 className={s.cardTitle}>Sudo over stdin</h3>
            <p className={s.cardBody}>
              The sudo password is piped to <code>sudo -S</code> — never interpolated into a command
              line, never in shell history, never visible to <code>ps</code>.
            </p>
          </article>
          <article className={s.card}>
            <span className={s.cardIcon}>👀</span>
            <h3 className={s.cardTitle}>Nothing runs unseen</h3>
            <p className={s.cardBody}>
              Every command is listed in the install review first, and every byte of output comes
              back to the terminal panel. No hidden steps.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- pro --- */

const PRO_TABS = [
  { icon: "📊", name: "Dashboard", note: "Load, memory, disk and uptime at a glance" },
  { icon: "⚙️", name: "Services", note: "systemd units — start, stop, restart, enable" },
  { icon: "🐳", name: "Docker", note: "Containers, images and logs without the CLI" },
  { icon: "📋", name: "Logs", note: "Tail and search journald and file logs live" },
  { icon: "📁", name: "Files", note: "Browse, edit and transfer over the same session" },
  { icon: "🛡", name: "Security", note: "Firewall, SSH hardening and update posture" },
];

function Pro() {
  return (
    <section className={s.section} id="pro">
      <div className={s.container}>
        <div className={`${s.sectionHead} ${s.centered}`}>
          <p className={s.kicker}>Coming with Pro</p>
          <h2 className={s.h2}>The rest of the cockpit</h2>
          <p className={s.sub}>
            Provisioning is step one. These tabs turn the same connection into day-two operations —
            in preview now, and included for everyone who joins during Phase 1.
          </p>
        </div>
        <div className={s.proGrid}>
          {PRO_TABS.map((t) => (
            <div className={s.proItem} key={t.name}>
              <span>{t.icon}</span>
              <span>
                <b>{t.name}</b>
                <small>{t.note}</small>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- faq --- */

function Faq() {
  const items: { q: string; a: React.ReactNode }[] = [
    {
      q: "Does sshwiz install anything on my server?",
      a: (
        <>
          No. It opens a normal SSH session and runs the same commands you would have typed. There is
          no daemon, no agent and nothing left behind — uninstalling sshwiz changes nothing on the
          box.
        </>
      ),
    },
    {
      q: "Where do my SSH keys and passwords live?",
      a: (
        <>
          On your machine only. Profiles are written to a local file encrypted with AES-256-GCM whose
          key sits in the OS keychain, and a key-file profile stores the path — your private key
          stays where it already was.
        </>
      ),
    },
    {
      q: "What happens if I install the same package twice?",
      a: (
        <>
          Nothing bad. Every recipe starts with a <code>check</code> step; if the package is already
          there, the install is skipped and the verify step still confirms it&apos;s healthy.
        </>
      ),
    },
    {
      q: "Can I use my own recipes and share them?",
      a: (
        <>
          Yes — write one with Custom recipe, then use the <code>{"{ }"}</code> badge on any card to
          export it as JSON. Teammates paste it straight into their own Shelf, or you can publish it
          to the marketplace for everyone. The{" "}
          <Link href="/docs">authoring guide</Link> covers what makes a good one.
        </>
      ),
    },
    {
      q: "Which AI models does the assist panel use?",
      a: (
        <>
          Whichever you bring. It speaks to Anthropic, OpenAI, or any OpenAI-compatible endpoint —
          including a local Ollama instance if you would rather nothing left the building.
        </>
      ),
    },
  ];

  return (
    <section className={s.section}>
      <div className={s.container}>
        <div className={s.sectionHead}>
          <p className={s.kicker}>Questions</p>
          <h2 className={s.h2}>The things people ask first</h2>
        </div>
        <div className={s.faq}>
          {items.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ download --- */

function Download() {
  return (
    <section id="download">
      <div className={s.container}>
        <div className={s.cta}>
          <p className={s.kicker}>Get started</p>
          <h2 className={s.h2}>Your next server, set up before the coffee cools</h2>
          <p className={s.sub} style={{ maxWidth: "54ch", margin: "14px auto 0" }}>
            Free through the Phase 1 preview. Install it, point it at a box you were going to set up
            by hand anyway, and see how far the shelf gets you.
          </p>
          <div className={s.platforms}>
            <a className={s.platform} href={DOWNLOADS.mac}>
              🍎 macOS <small>Apple silicon &amp; Intel</small>
            </a>
            <a className={s.platform} href={DOWNLOADS.linux}>
              🐧 Linux <small>AppImage &amp; .deb</small>
            </a>
            <a className={s.platform} href={DOWNLOADS.windows}>
              🪟 Windows <small>x64 installer</small>
            </a>
          </div>
          <p className={s.microNote}>
            Prefer to look around first? Read the{" "}
            <Link href="/docs" style={{ color: "inherit" }}>
              authoring guide
            </Link>{" "}
            to see exactly what a recipe is made of.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- footer --- */

function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`${s.container} ${s.footerInner}`}>
        <a className={s.brand} href="#top">
          <span className={s.brandMark}>
            <BrandGlyph />
          </span>
          sshwiz
        </a>
        <span>© {new Date().getFullYear()} sshwiz</span>
        <div className={s.footerRight}>
          <Link href="/docs">Authoring guide</Link>
          <Link href="/admin">Admin portal</Link>
        </div>
      </div>
    </footer>
  );
}

import { ImageResponse } from "next/og";

/** The wordmark's chevron, as JSX for next/og (which has no SVG file loader). */
function Glyph({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M14 18 30 32 14 46"
        stroke="#fff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M36 46h16" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

/** 180×180 PNG for apple-touch-icon and the manifest. */
export function renderAppIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#5b5ce2",
          borderRadius: 40,
        }}
      >
        <Glyph size={150} />
      </div>
    ),
    { width: 180, height: 180 },
  );
}

/** 1200×630 PNG shared by og:image and twitter:image. */
export function renderSocialCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b1233 0%, #070c22 60%, #101a4a 100%)",
          color: "#e9ecff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#5b5ce2",
              borderRadius: 16,
            }}
          >
            <Glyph size={48} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>sshwiz</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.05, letterSpacing: -3 }}>
            SSH in. Click. It&apos;s installed.
          </div>
          <div style={{ fontSize: 34, color: "#94a1d8", lineHeight: 1.35 }}>
            Set up a Linux server in a few clicks — encrypted SSH profiles, one-click install
            recipes and a live terminal that shows every command first.
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 26, color: "#93a4ff" }}>
          <span>macOS · Linux · Windows</span>
          <span>Free during the Phase 1 preview</span>
          <span>sshwiz.com</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

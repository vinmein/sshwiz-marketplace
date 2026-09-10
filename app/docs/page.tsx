import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = {
  title: "Authoring guide · sshwiz Marketplace Admin",
};

// Read at build time; the page is prerendered as static HTML, so AUTHORING.md
// doesn't need to exist in the runtime image.
export const dynamic = "force-static";

export default function DocsPage() {
  const source = readFileSync(join(process.cwd(), "AUTHORING.md"), "utf8");
  return (
    <main className="docs" id="main">
      <p>
        <Link href="/admin">← Back to the dashboard</Link>
      </p>
      <Markdown remarkPlugins={[remarkGfm]}>{source}</Markdown>
    </main>
  );
}

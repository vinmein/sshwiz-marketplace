/** Renders a schema.org JSON-LD block. The payload is our own constants, but
    `<` is still escaped so a stray "</script>" in copy can't break out. */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

import React, { useEffect, useState } from "react";
import MarketingLayout from "@/components/MarketingLayout";
import { api } from "@/lib/api";

/**
 * Generic renderer for editable legal pages (privacy / terms / refund).
 * Reads body from /api/legal/{kind}. Body is plain text — renders with
 * preserved newlines + simple Markdown-style ## heading and ** bold lifts.
 */
export default function LegalPage({ kind }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/legal/${kind}`);
        setData(data);
      } catch {
        setData({ title: "Legal", body: "Page not available." });
      }
    })();
  }, [kind]);

  return (
    <MarketingLayout>
      <section className="py-16 max-w-3xl mx-auto px-5 lg:px-8" data-testid={`legal-${kind}-page`}>
        <p className="chip">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4">
          {data?.title || "…"}
        </h1>
        {data?.updated_at && !data.is_default && (
          <p className="text-secondary mt-3 text-sm">
            Last updated: {new Date(data.updated_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}

        {!data && (
          <div className="mt-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <div className="mt-10 text-secondary leading-relaxed space-y-4" data-testid={`legal-${kind}-body`}>
            {renderLegal(data.body || "")}
          </div>
        )}
      </section>
    </MarketingLayout>
  );
}

function renderLegal(body) {
  // Very small renderer: split on blank lines into paragraphs.
  // Lines starting with `## ` become H2; lines starting with `# ` become H1-ish.
  // Bullets starting with `- ` group into a <ul>.
  const blocks = body.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("## ")) {
      return <h2 key={i} className="text-2xl font-heading text-zinc-900 mt-6">{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith("# ")) {
      return <h2 key={i} className="text-2xl font-heading text-zinc-900 mt-6">{trimmed.slice(2)}</h2>;
    }
    if (trimmed.startsWith("- ")) {
      const items = trimmed.split(/\n/).map(l => l.replace(/^- /, ""));
      return (
        <ul key={i} className="list-disc pl-6 space-y-1">
          {items.map((it, j) => <li key={j}>{it}</li>)}
        </ul>
      );
    }
    return <p key={i} className="whitespace-pre-wrap">{trimmed}</p>;
  });
}

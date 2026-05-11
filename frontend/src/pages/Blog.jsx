import React from "react";
import MarketingLayout from "@/components/MarketingLayout";
import { ArrowUpRight } from "lucide-react";

const POSTS = [
  { tag: "Tutorial", title: "Cinematic prompts that actually work in Sora 2", date: "Feb 12, 2026", excerpt: "How to brief Sora like a director — six rules that double the hit rate." },
  { tag: "Product", title: "Introducing scene-by-scene timelines", date: "Feb 04, 2026", excerpt: "Inside the new timeline view that gives you precise timecodes, camera moves, and prompts per beat." },
  { tag: "Craft", title: "The cyberpunk preset — color, light, decay", date: "Jan 27, 2026", excerpt: "A deep dive into the visual language behind our cyberpunk style preset." },
  { tag: "Research", title: "Why prompt engineering needs frame intelligence", date: "Jan 12, 2026", excerpt: "We compared model outputs across 1,000 clips — here's what frame-level grounding changes." },
];

export default function Blog() {
  return (
    <MarketingLayout>
      <section className="py-16 max-w-5xl mx-auto px-5 lg:px-8">
        <p className="chip">Stories</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4">Notes from the <span className="gradient-text">prompt lab</span>.</h1>
        <p className="text-secondary mt-4 max-w-2xl">Tutorials, product news, and craft posts for AI filmmakers and prompt engineers.</p>

        <div className="grid md:grid-cols-2 gap-5 mt-12">
          {POSTS.map((p, i) => (
            <article key={i} data-testid={`blog-post-${i}`} className="glass rounded-2xl p-6 hover:bg-zinc-100 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <span className="chip">{p.tag}</span>
                <span className="text-xs text-muted">{p.date}</span>
              </div>
              <h2 className="text-xl font-heading font-medium leading-snug">{p.title}</h2>
              <p className="text-secondary text-sm mt-3 leading-relaxed">{p.excerpt}</p>
              <div className="mt-4 text-sm text-cyan-700 flex items-center gap-1 hover:gap-2 transition-all">Read more <ArrowUpRight size={14} /></div>
            </article>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

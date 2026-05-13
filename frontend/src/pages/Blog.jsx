import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MarketingLayout from "@/components/MarketingLayout";
import { api } from "@/lib/api";
import { ArrowUpRight } from "lucide-react";

export default function Blog() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/blogs");
        setPosts(Array.isArray(data) ? data : []);
      } catch {
        setPosts([]);
      }
    })();
  }, []);

  return (
    <MarketingLayout>
      <section className="py-16 max-w-5xl mx-auto px-5 lg:px-8">
        <p className="chip">Stories</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4">Notes from the <span className="gradient-text">prompt lab</span>.</h1>
        <p className="text-secondary mt-4 max-w-2xl">Tutorials, product news, and craft posts for AI filmmakers and prompt engineers.</p>

        {posts === null && (
          <div className="mt-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
          </div>
        )}

        {posts && posts.length === 0 && (
          <div className="mt-12 glass rounded-2xl p-10 text-center" data-testid="blog-empty">
            <p className="text-secondary">No posts published yet. Stay tuned.</p>
          </div>
        )}

        {posts && posts.length > 0 && (
          <div className="grid md:grid-cols-2 gap-5 mt-12">
            {posts.map((p) => (
              <Link
                to={`/blog/${p.slug}`}
                key={p.blog_id || p.slug}
                data-testid={`blog-post-${p.slug}`}
                className="glass rounded-2xl overflow-hidden hover:bg-zinc-100 transition-all cursor-pointer block"
              >
                {p.thumbnail_url && (
                  <div className="aspect-[16/9] overflow-hidden border-b border-zinc-200">
                    <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="chip">{p.tag || "Post"}</span>
                    <span className="text-xs text-muted">{p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}</span>
                  </div>
                  <h2 className="text-xl font-heading font-medium leading-snug">{p.title}</h2>
                  {p.excerpt && <p className="text-secondary text-sm mt-3 leading-relaxed line-clamp-3">{p.excerpt}</p>}
                  <div className="mt-4 text-sm text-cyan-700 flex items-center gap-1 hover:gap-2 transition-all">Read more <ArrowUpRight size={14} /></div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </MarketingLayout>
  );
}

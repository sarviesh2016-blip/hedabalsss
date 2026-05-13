import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MarketingLayout from "@/components/MarketingLayout";
import { api } from "@/lib/api";
import { ArrowLeft, Calendar, Tag } from "lucide-react";

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/blogs/${slug}`);
        setPost(data);
      } catch (e) {
        setErr(e?.response?.data?.detail || "Post not found");
      }
    })();
  }, [slug]);

  if (err) {
    return (
      <MarketingLayout>
        <section className="py-24 max-w-3xl mx-auto px-5 text-center">
          <p className="chip mb-4">404</p>
          <h1 className="text-3xl font-heading font-semibold">Post not found</h1>
          <p className="text-secondary mt-3">{err}</p>
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-violet-700 mt-6 hover:underline">
            <ArrowLeft size={14} /> Back to blog
          </Link>
        </section>
      </MarketingLayout>
    );
  }
  if (!post) {
    return (
      <MarketingLayout>
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <article className="py-16 max-w-3xl mx-auto px-5 lg:px-8" data-testid="blog-post-page">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-secondary hover:text-zinc-900">
          <ArrowLeft size={14} /> All posts
        </Link>
        <div className="mt-6 flex items-center gap-3 text-xs text-muted">
          {post.tag && <span className="chip inline-flex items-center gap-1"><Tag size={11} />{post.tag}</span>}
          {post.created_at && <span className="flex items-center gap-1"><Calendar size={11} />{new Date(post.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>}
        </div>
        <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4 leading-tight" data-testid="blog-post-title">{post.title}</h1>
        {post.excerpt && (
          <p className="text-secondary text-lg mt-4 leading-relaxed">{post.excerpt}</p>
        )}
        {post.thumbnail_url && (
          <div className="aspect-video rounded-2xl overflow-hidden mt-10 border border-zinc-200">
            <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div
          className="prose prose-zinc max-w-none mt-10 text-zinc-800 leading-relaxed whitespace-pre-wrap"
          data-testid="blog-post-body"
        >
          {post.body}
        </div>
        {post.author_name && (
          <p className="text-xs text-muted mt-12 border-t border-zinc-200 pt-4">— {post.author_name}</p>
        )}
      </article>
    </MarketingLayout>
  );
}

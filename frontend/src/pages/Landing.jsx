import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MarketingLayout from "@/components/MarketingLayout";
import CreateTicketDialog from "@/components/CreateTicketDialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Wand2, Film, Camera, Lightbulb, Clapperboard,
  ArrowRight, Zap, Code2, Download, PlayCircle, CheckCircle2, Star,
  LifeBuoy
} from "lucide-react";

const FEATURES = [
  { icon: Film, title: "Scene-by-scene breakdown", text: "Auto-detected timecodes, camera moves, lighting and actions for every beat." },
  { icon: Camera, title: "Camera & lens awareness", text: "Capture dolly-ins, handheld whip-pans, anamorphic flares — described in detail." },
  { icon: Lightbulb, title: "Lighting & mood", text: "From golden-hour rim to neon cyan key — every frame gets its lighting recipe." },
  { icon: Clapperboard, title: "Six AI-model presets", text: "Veo, Sora, Kling, Runway, Midjourney, Flux — each prompt is tuned per engine." },
  { icon: Wand2, title: "Style presets", text: "Cinematic, anime, hyperrealistic, documentary, luxury, cyberpunk — instantly." },
  { icon: Code2, title: "Developer API", text: "Plug VideosToPrompt into your pipeline with a clean REST API and JSON export." },
];

const WORKFLOW = [
  { num: "01", title: "Drop your video", text: "MP4, MOV or WEBM. Up to 100MB. Everything stays private to your account." },
  { num: "02", title: "AI reads every frame", text: "Gemini 3 Pro inspects scenes, cameras, lighting, characters, and dialogue." },
  { num: "03", title: "Export your prompts", text: "Copy, download as TXT or export structured JSON for any AI video model." },
];

const TESTIMONIALS = [
  { name: "Aanya Verma", role: "Music video director", text: "It writes prompts the way I'd brief a DP. Saved me 6 hours on a single edit." },
  { name: "Marcus Reed", role: "AI filmmaker", text: "The scene breakdown is uncanny. I now ship 3x more Sora cuts per week." },
  { name: "Priya Nair", role: "Brand designer", text: "Cyan, cinematic, luxury — the presets nail the aesthetic instantly." },
];

const FAQS = [
  { q: "What video formats are supported?", a: "MP4, MOV and WEBM up to 100MB. We're rolling out 4K + longer durations soon." },
  { q: "Which AI models can I export to?", a: "Veo, Sora, Kling, Runway Gen-3, Midjourney and Flux — with prompts optimized for each." },
  { q: "Is my video private?", a: "Yes. Videos and prompts are scoped to your account. You can delete them anytime." },
  { q: "Can I use this commercially?", a: "Yes — the Studio plan includes a commercial license and white-label exports." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [ticketOpen, setTicketOpen] = useState(false);
  return (
    <MarketingLayout>
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 lg:pt-28 pb-24" data-testid="hero-section">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.10), transparent)" }} />
        <div className="absolute top-40 right-10 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(6,182,212,0.10), transparent)" }} />
        <div className="relative max-w-7xl mx-auto px-5 lg:px-8">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="chip mb-6"><Sparkles size={12} /> Powered by Gemini 3 Pro</div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-semibold leading-[1.02] tracking-tight">
                Turn any video into
                <br />
                <span className="gradient-text">powerful AI prompts.</span>
              </h1>
              <p className="text-secondary mt-6 text-base sm:text-lg max-w-xl leading-relaxed">
                Upload any video and instantly generate cinematic AI prompts, scene breakdowns, camera movements,
                lighting details, and export-ready prompts for the top AI tools.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-9">
                <Button data-testid="hero-generate-btn" onClick={() => navigate("/login")} className="btn-gradient rounded-full px-7 h-12 text-sm font-medium">
                  Generate Prompt <ArrowRight size={16} className="ml-1" />
                </Button>
                <Button data-testid="hero-pricing-btn" onClick={() => navigate("/pricing")} variant="ghost" className="rounded-full px-7 h-12 text-sm bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900">
                  View Pricing
                </Button>
              </div>
              <div className="mt-10 flex items-center gap-6 text-xs text-muted">
                <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> 2 credits per day · free</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> No credit card</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /> Export JSON</span>
              </div>
            </motion.div>

            {/* Demo preview card */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative">
              <div className="glass-strong rounded-2xl p-5 relative overflow-hidden" data-testid="demo-preview-card">
                <div className="aspect-video rounded-xl overflow-hidden relative">
                  <img src="https://images.pexels.com/photos/28122495/pexels-photo-28122495.jpeg" alt="cinematic" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-200 backdrop-blur-md flex items-center justify-center ring-cyan-glow">
                      <PlayCircle size={28} className="text-zinc-900" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 chip text-[10px]">Live demo · 00:12</div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs text-cyan-700 font-mono">AI analyzing scenes…</span>
                  </div>
                  <div className="font-mono text-xs leading-relaxed text-secondary bg-zinc-100 rounded-lg p-3 border border-zinc-200">
                    <span className="text-violet-700">[00:00–00:03]</span> Slow dolly-in on a rain-soaked street, neon cyan rim,<br/>
                    handheld 35mm, shallow DOF, atmospheric haze, teal-orange grade,<br/>
                    <span className="text-cyan-700">--model veo · cinematic · 24fps</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {["Veo", "Sora", "Kling", "Runway", "Midjourney", "Flux"].map((m) => (
                      <span key={m} className="chip text-[10px]">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-8 -right-6 w-40 h-40 bg-brand-gradient-soft blur-3xl rounded-full -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="border-y border-zinc-200 py-10 bg-white/60">
        <div className="max-w-7xl mx-auto px-5 lg:px-8">
          <p className="text-center text-xs uppercase tracking-[0.3em] text-muted mb-6">Trusted by creators using</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm font-mono text-secondary">
            {["VEO", "SORA", "KLING", "RUNWAY", "MIDJOURNEY", "FLUX", "STABLE DIFFUSION"].map((n) => (
              <span key={n} className="hover:text-zinc-900 transition-colors">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 max-w-7xl mx-auto px-5 lg:px-8" data-testid="features-section">
        <div className="max-w-2xl mb-14">
          <p className="chip mb-4"><Zap size={12} /> Features</p>
          <h2 className="text-4xl sm:text-5xl font-heading font-semibold">Everything you need to brief a <span className="gradient-text">cinematic AI</span>.</h2>
          <p className="text-secondary mt-4">Stop writing prompts from scratch. Drop a reference — we'll turn it into production-ready briefs for every major AI model.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              className="glass rounded-2xl p-6 hover:bg-zinc-100 transition-all"
              data-testid={`feature-card-${i}`}
            >
              <div className="w-10 h-10 rounded-lg bg-brand-gradient-soft border border-zinc-200 flex items-center justify-center mb-4">
                <f.icon size={18} className="text-violet-700" />
              </div>
              <h3 className="text-lg font-medium">{f.title}</h3>
              <p className="text-secondary text-sm mt-2 leading-relaxed">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section className="py-24 max-w-7xl mx-auto px-5 lg:px-8" data-testid="workflow-section">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-14 items-center">
          <div>
            <p className="chip mb-4">Workflow</p>
            <h2 className="text-4xl sm:text-5xl font-heading font-semibold">Three steps, infinite prompts.</h2>
            <p className="text-secondary mt-4 max-w-md">From upload to export in under a minute. No prompt engineering degree required.</p>
          </div>
          <div className="space-y-4">
            {WORKFLOW.map((w, i) => (
              <div key={w.num} className="glass rounded-2xl p-6 flex gap-5 items-start" data-testid={`workflow-step-${i}`}>
                <div className="text-3xl font-mono gradient-text">{w.num}</div>
                <div>
                  <h4 className="text-lg font-medium">{w.title}</h4>
                  <p className="text-secondary text-sm mt-1">{w.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROMPT OUTPUT PREVIEW */}
      <section className="py-24 max-w-7xl mx-auto px-5 lg:px-8" data-testid="prompt-preview-section">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="chip mb-4">What you get</p>
          <h2 className="text-4xl sm:text-5xl font-heading font-semibold">A timeline of perfectly-crafted prompts.</h2>
        </div>
        <div className="glass-strong rounded-3xl p-6 lg:p-10 relative overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-3">Scene Timeline</p>
              <div className="space-y-3">
                {[
                  { tc: "00:00–00:04", title: "Establishing wide", tags: ["dolly-in", "neon rim"] },
                  { tc: "00:04–00:09", title: "Close-up subject", tags: ["handheld", "warm key"] },
                  { tc: "00:09–00:12", title: "Macro insert", tags: ["focus pull", "practical"] },
                ].map((s, i) => (
                  <div key={s.tc} className={`relative pl-5 py-3 ${i === 1 ? "border-l-2 border-cyan-500" : "border-l border-zinc-200"}`}>
                    <p className="text-xs font-mono text-cyan-700">{s.tc}</p>
                    <p className="text-sm mt-1">{s.title}</p>
                    <div className="flex gap-1.5 mt-2">
                      {s.tags.map((t) => <span key={t} className="chip text-[10px]">{t}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-3">Model output (Sora)</p>
              <div className="font-mono text-xs leading-relaxed text-secondary bg-zinc-100 rounded-xl p-5 border border-zinc-200 min-h-[260px]">
                <span className="text-violet-700">// Sora · cinematic preset</span>{"\n"}
                A rain-soaked Tokyo alley at 3 AM, slow dolly-in on a lone figure under a flickering neon sign,
                shallow depth of field, anamorphic 35mm lens, atmospheric haze diffusing cyan and magenta neon,
                practical lights reflecting in wet pavement, handheld micro-shake, teal-orange grade, 24fps,
                cinematic motion blur, hyper-detailed textures on wet fabric and chrome surfaces.
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full" data-testid="preview-copy-btn">Copy</Button>
                <Button size="sm" className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full" data-testid="preview-download-btn"><Download size={14} className="mr-1" /> TXT</Button>
                <Button size="sm" className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full" data-testid="preview-json-btn">JSON</Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className="glass rounded-2xl p-6" data-testid={`testimonial-${i}`}>
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(s => <Star key={s} size={14} className="fill-amber-500 text-amber-700" />)}
              </div>
              <p className="text-sm leading-relaxed">"{t.text}"</p>
              <div className="mt-5">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASE */}
      <section className="py-20 max-w-7xl mx-auto px-5 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-heading font-semibold">Built for creators. <span className="gradient-text">Priced for everyone.</span></h2>
        <p className="text-secondary mt-3">Start free. Scale to studio when you're ready.</p>
        <div className="mt-8">
          <Button data-testid="see-pricing-btn" onClick={() => navigate("/pricing")} className="btn-gradient rounded-full px-7 h-12">See plans <ArrowRight size={16} className="ml-1" /></Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 max-w-3xl mx-auto px-5 lg:px-8" data-testid="faq-section">
        <h2 className="text-3xl sm:text-4xl font-heading font-semibold text-center mb-10">Questions, answered.</h2>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <details key={i} className="glass rounded-xl p-5 group" data-testid={`faq-item-${i}`}>
              <summary className="cursor-pointer list-none flex items-center justify-between">
                <span className="font-medium">{f.q}</span>
                <span className="text-secondary group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-secondary text-sm mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* SUPPORT TICKET CTA */}
      <section className="pb-24 max-w-3xl mx-auto px-5 lg:px-8" data-testid="support-cta-section">
        <div className="glass-strong rounded-3xl p-8 lg:p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-gradient-soft border border-zinc-200 flex items-center justify-center mb-4">
            <LifeBuoy size={22} className="text-violet-700" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-heading font-semibold">Still have a question?</h3>
          <p className="text-secondary mt-3 max-w-md mx-auto">
            Open a support ticket and our team will get back to you on a dedicated thread — no email back-and-forth.
          </p>
          <Button
            onClick={() => setTicketOpen(true)}
            data-testid="home-create-ticket-btn"
            className="btn-gradient rounded-full px-7 h-12 mt-6"
          >
            Create a ticket <ArrowRight size={16} className="ml-1" />
          </Button>
        </div>
      </section>

      <CreateTicketDialog open={ticketOpen} onOpenChange={setTicketOpen} />
    </MarketingLayout>
  );
}

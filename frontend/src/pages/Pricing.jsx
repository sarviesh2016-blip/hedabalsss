import React from "react";
import { useNavigate } from "react-router-dom";
import MarketingLayout from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    period: "forever",
    cta: "Start free",
    highlight: false,
    features: [
      "2 credits per day (refreshed daily)",
      "Short prompt length",
      "Basic TXT export",
      "Community support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "₹499",
    period: "/ month",
    cta: "Get Starter",
    highlight: false,
    features: [
      "100 credits / month",
      "Prompt history",
      "TXT export",
      "Faster processing queue",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹1,499",
    period: "/ month",
    cta: "Get Pro",
    highlight: true,
    features: [
      "500 credits / month",
      "Scene timeline view",
      "Advanced prompt enhancer",
      "JSON export",
      "API access",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    price: "₹4,999",
    period: "/ month",
    cta: "Get Studio",
    highlight: false,
    features: [
      "2,500 credits / month",
      "Team-ready workspace",
      "Priority queue",
      "White-label export",
      "Commercial license",
    ],
  },
];

const PACKS = [
  { id: "pack_50", name: "50 Credits", price: "₹199" },
  { id: "pack_150", name: "150 Credits", price: "₹499" },
  { id: "pack_500", name: "500 Credits", price: "₹1,299" },
];

export default function Pricing() {
  const navigate = useNavigate();
  return (
    <MarketingLayout>
      <section className="py-20 max-w-7xl mx-auto px-5 lg:px-8 text-center">
        <p className="chip mx-auto inline-flex"><Sparkles size={12} /> Pricing</p>
        <h1 className="text-5xl sm:text-6xl font-heading font-semibold mt-5">Simple, <span className="gradient-text">credit-based</span> pricing.</h1>
        <p className="text-secondary mt-4 max-w-xl mx-auto">One credit = one video prompt generation. Subscribe monthly or top-up with credit packs anytime.</p>
      </section>

      <section className="max-w-7xl mx-auto px-5 lg:px-8 pb-20">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((p) => (
            <div
              key={p.id}
              data-testid={`plan-card-${p.id}`}
              className={`relative rounded-2xl p-6 ${
                p.highlight
                  ? "bg-brand-gradient-soft border-2 border-violet-400 ring-cyan-glow"
                  : "glass"
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 chip bg-brand-gradient !text-zinc-900 !border-transparent">
                  <Zap size={10} /> Most Popular
                </div>
              )}
              <p className="text-sm uppercase tracking-widest text-muted">{p.name}</p>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-4xl font-heading font-semibold">{p.price}</span>
                <span className="text-secondary text-sm pb-1">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-secondary">
                    <CheckCircle2 size={15} className="text-cyan-600 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                data-testid={`plan-cta-${p.id}`}
                onClick={() => navigate(p.id === "free" ? "/login" : "/billing")}
                className={`w-full mt-7 rounded-full h-11 ${
                  p.highlight
                    ? "btn-gradient"
                    : "bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900"
                }`}
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-heading font-semibold text-center">One-time credit packs</h2>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            {PACKS.map((pk) => (
              <div key={pk.id} className="glass rounded-2xl p-6 flex items-center justify-between" data-testid={`pack-card-${pk.id}`}>
                <div>
                  <p className="text-lg font-medium">{pk.name}</p>
                  <p className="text-xs text-muted mt-1">No subscription required</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-heading font-semibold gradient-text">{pk.price}</p>
                  <Button onClick={() => navigate("/billing")} data-testid={`pack-buy-${pk.id}`} size="sm" className="mt-2 bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full">
                    Buy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

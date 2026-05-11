import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Upload, Film, Sparkles, TrendingUp, Clock, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_COLORS = {
  completed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  processing: "text-cyan-300 bg-cyan-400/10 border-cyan-400/20",
  failed: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  queued: "text-amber-300 bg-amber-400/10 border-amber-400/20",
  uploaded: "text-secondary bg-white/5 border-white/10",
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gens, setGens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/generations?limit=20");
        setGens(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completed = gens.filter(g => g.status === "completed").length;
  const processing = gens.filter(g => g.status === "processing" || g.status === "queued").length;

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Welcome back</p>
          <h1 className="text-3xl sm:text-4xl font-heading font-semibold mt-1">{user?.name?.split(" ")[0] || "Creator"}.</h1>
          <p className="text-secondary text-sm mt-2">Drop a clip — get production-grade AI prompts in seconds.</p>
        </div>
        <Button data-testid="dashboard-new-gen-btn" onClick={() => navigate("/upload")} className="btn-gradient rounded-full px-6 h-11 self-start lg:self-end">
          <Upload size={16} className="mr-2" /> New Generation
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Credits", value: user?.credits ?? 0, icon: Sparkles, accent: "from-violet-500 to-fuchsia-500", testid: "stat-credits" },
          { label: "Plan", value: (user?.plan || "free").toUpperCase(), icon: TrendingUp, accent: "from-cyan-400 to-blue-500", testid: "stat-plan" },
          { label: "Completed", value: completed, icon: Film, accent: "from-emerald-400 to-teal-500", testid: "stat-completed" },
          { label: "In Queue", value: processing, icon: Clock, accent: "from-amber-400 to-orange-500", testid: "stat-queue" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-5 relative overflow-hidden"
            data-testid={s.testid}
          >
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl bg-gradient-to-br ${s.accent}`} />
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted">{s.label}</p>
              <s.icon size={16} className="text-secondary" />
            </div>
            <p className="text-3xl font-heading font-semibold mt-3">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Recent generations */}
      <div className="glass rounded-2xl overflow-hidden" data-testid="recent-generations">
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
          <h3 className="font-heading text-lg">Recent generations</h3>
          <Link to="/saved-prompts" data-testid="see-saved-link" className="text-xs text-secondary hover:text-white inline-flex items-center gap-1">
            Saved prompts <ArrowUpRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="p-10 grid gap-3">
            {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}
          </div>
        ) : gens.length === 0 ? (
          <div className="p-12 text-center" data-testid="empty-generations">
            <div className="w-16 h-16 rounded-full bg-brand-gradient-soft border border-white/10 mx-auto flex items-center justify-center mb-4">
              <Film size={24} className="text-violet-300" />
            </div>
            <p className="font-medium">No generations yet</p>
            <p className="text-secondary text-sm mt-1 mb-5">Upload your first video to see it here.</p>
            <Button onClick={() => navigate("/upload")} data-testid="empty-upload-btn" className="btn-gradient rounded-full px-5">Upload video</Button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {gens.map((g) => (
              <button
                key={g.generation_id}
                onClick={() => navigate(`/generations/${g.generation_id}`)}
                data-testid={`gen-row-${g.generation_id}`}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-brand-gradient-soft border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Film size={16} className="text-violet-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{(g.output?.summary || g.output?.shortPrompt || "Untitled prompt").slice(0, 80)}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {g.selected_model?.toUpperCase()} · {g.style_preset} · {new Date(g.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border ${STATUS_COLORS[g.status] || STATUS_COLORS.uploaded}`}>
                  {g.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

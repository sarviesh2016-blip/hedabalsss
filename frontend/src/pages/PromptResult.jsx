import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Copy, Download, Bookmark, FileJson, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const MODELS = ["veo", "sora", "kling", "runway", "midjourney", "flux"];

export default function PromptResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gen, setGen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeModel, setActiveModel] = useState("veo");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/generations/${id}`);
        setGen(data);
        setActiveModel(data.selected_model || "veo");
        setSaveTitle((data.output?.shortPrompt || "Untitled prompt").slice(0, 60));
      } catch (e) {
        toast.error("Could not load generation");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate]);

  const copy = async (text, label = "Prompt") => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const downloadTxt = () => {
    const out = gen?.output || {};
    const text = `# ${gen.selected_model.toUpperCase()} · ${gen.style_preset}\n\n## Summary\n${out.summary}\n\n## Short prompt\n${out.shortPrompt}\n\n## Detailed prompt\n${out.detailedPrompt}\n\n## Scene breakdown\n${(out.sceneBreakdown || []).map(s => `${s.timecode}  ${s.scene}\n  cam: ${s.cameraMove}\n  light: ${s.lighting}\n  actions: ${s.actions}\n  prompt: ${s.prompt}`).join("\n\n")}\n\n## Per-model prompts\n${Object.entries(out.modelPrompts || {}).map(([k, v]) => `[${k.toUpperCase()}]\n${v}`).join("\n\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gen.generation_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(gen.output, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gen.generation_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const savePrompt = async () => {
    try {
      await api.post("/save-prompt", { generation_id: id, title: saveTitle });
      toast.success("Saved to your library");
      setSaveOpen(false);
    } catch {
      toast.error("Save failed");
    }
  };

  if (loading) {
    return <DashboardLayout><div className="space-y-3 max-w-4xl">{[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}</div></DashboardLayout>;
  }
  if (!gen) return null;

  const out = gen.output || {};
  const scenes = out.sceneBreakdown || [];
  const modelPrompts = out.modelPrompts || {};

  return (
    <DashboardLayout>
      <button onClick={() => navigate(-1)} data-testid="back-btn" className="text-secondary hover:text-white text-sm flex items-center gap-2 mb-5">
        <ArrowLeft size={14} /> Back
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="chip">{gen.selected_model?.toUpperCase()}</span>
            <span className="chip">{gen.style_preset}</span>
            <span className="chip">{new Date(gen.created_at).toLocaleString()}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-semibold max-w-3xl">{out.summary || "Generated prompt"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="save-btn" onClick={() => setSaveOpen(true)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full">
            <Bookmark size={14} className="mr-1" /> Save
          </Button>
          <Button data-testid="download-txt-btn" onClick={downloadTxt} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full">
            <Download size={14} className="mr-1" /> TXT
          </Button>
          <Button data-testid="download-json-btn" onClick={downloadJson} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full">
            <FileJson size={14} className="mr-1" /> JSON
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6">
        {/* Scene Timeline */}
        <div className="glass rounded-2xl p-6" data-testid="scene-timeline">
          <p className="text-xs uppercase tracking-widest text-muted mb-4">Scene Timeline</p>
          {scenes.length === 0 ? (
            <p className="text-secondary text-sm">No scenes detected.</p>
          ) : (
            <div className="space-y-3">
              {scenes.map((s, i) => (
                <div key={i} className="relative pl-5 py-3 border-l-2 border-cyan-400/40 hover:border-cyan-400 transition-colors" data-testid={`scene-${i}`}>
                  <p className="text-xs font-mono text-cyan-300">{s.timecode}</p>
                  <p className="text-sm mt-1 font-medium">{s.scene}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {s.cameraMove && <span className="chip text-[10px]">cam: {s.cameraMove}</span>}
                    {s.lighting && <span className="chip text-[10px]">light: {s.lighting}</span>}
                    {s.actions && <span className="chip text-[10px]">{s.actions}</span>}
                  </div>
                  <p className="text-xs text-secondary mt-3 font-mono leading-relaxed">{s.prompt}</p>
                  <button
                    onClick={() => copy(s.prompt, `Scene ${i + 1}`)}
                    data-testid={`scene-copy-${i}`}
                    className="absolute top-3 right-0 text-secondary hover:text-white p-1"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/5 space-y-3 text-sm">
            {out.cameraDetails && <Row label="Camera" value={out.cameraDetails} />}
            {out.lightingDetails && <Row label="Lighting" value={out.lightingDetails} />}
            {out.mood && <Row label="Mood" value={out.mood} />}
            {out.characters && <Row label="Characters" value={out.characters} />}
            {out.objects && <Row label="Objects" value={out.objects} />}
            {out.transcription && <Row label="Transcription" value={out.transcription} />}
          </div>
        </div>

        {/* Model Prompts */}
        <div className="space-y-5">
          <div className="glass rounded-2xl p-6" data-testid="short-prompt-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-muted">Short prompt</p>
              <button onClick={() => copy(out.shortPrompt, "Short prompt")} data-testid="copy-short" className="text-secondary hover:text-white"><Copy size={14} /></button>
            </div>
            <p className="text-sm leading-relaxed font-mono">{out.shortPrompt || "—"}</p>
          </div>

          <div className="glass rounded-2xl p-6" data-testid="detailed-prompt-card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-muted">Detailed cinematic prompt</p>
              <button onClick={() => copy(out.detailedPrompt, "Detailed prompt")} data-testid="copy-detailed" className="text-secondary hover:text-white"><Copy size={14} /></button>
            </div>
            <p className="text-sm leading-relaxed font-mono text-secondary">{out.detailedPrompt || "—"}</p>
          </div>

          <div className="glass rounded-2xl p-6">
            <p className="text-xs uppercase tracking-widest text-muted mb-4">Per-model prompts</p>
            <Tabs value={activeModel} onValueChange={setActiveModel}>
              <TabsList className="bg-white/5 p-1 rounded-lg flex flex-wrap h-auto">
                {MODELS.map(m => (
                  <TabsTrigger key={m} value={m} data-testid={`model-tab-${m}`} className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-secondary text-xs rounded-md">
                    {m.toUpperCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
              {MODELS.map(m => (
                <TabsContent key={m} value={m} className="mt-4">
                  <div className="relative">
                    <pre className="font-mono text-xs leading-relaxed text-secondary bg-black/40 rounded-xl p-4 border border-white/5 whitespace-pre-wrap break-words min-h-[160px]" data-testid={`model-prompt-${m}`}>
                      {modelPrompts[m] || "(no prompt for this model)"}
                    </pre>
                    <button
                      onClick={() => copy(modelPrompts[m], m.toUpperCase())}
                      data-testid={`copy-model-${m}`}
                      className="absolute top-3 right-3 text-secondary hover:text-white"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white">
          <DialogHeader><DialogTitle>Save prompt</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-secondary text-sm">Give your prompt a title.</p>
            <Input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} data-testid="save-title-input" className="bg-black/40 border-white/10 text-white" />
            <Button onClick={savePrompt} data-testid="confirm-save-btn" className="btn-gradient w-full rounded-full">Save to library</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="text-xs uppercase tracking-widest text-muted w-24 flex-shrink-0">{label}</span>
      <span className="text-secondary flex-1">{value}</span>
    </div>
  );
}

import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload as UploadIcon, Film, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

const MODELS = ["veo", "sora", "kling", "runway", "midjourney", "flux"];
const STYLES = ["cinematic", "anime", "hyperrealistic", "documentary", "luxury", "cyberpunk"];

const MAX_BYTES = 100 * 1024 * 1024;
const ACCEPT = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];

export default function UploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [model, setModel] = useState("veo");
  const [style, setStyle] = useState("cinematic");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error("File exceeds 100MB."); return; }
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["mp4", "mov", "webm", "m4v"].includes(ext) && !ACCEPT.includes(f.type)) {
      toast.error("Only MP4, MOV, WEBM allowed."); return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const clear = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onGenerate = async () => {
    if (!file) { toast.error("Pick a video first."); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data: video } = await api.post("/upload/video", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Video uploaded");
      setUploading(false);
      setGenerating(true);
      const { data: gen } = await api.post("/generate-prompt", {
        video_id: video.video_id,
        selected_model: model,
        style_preset: style,
      });
      toast.success("Generation queued — analyzing now");
      navigate(`/generations/${gen.generation_id}`);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.detail || "Generation failed";
      toast.error(typeof msg === "string" ? msg : "Generation failed");
    } finally {
      setUploading(false);
      setGenerating(false);
    }
  };

  const busy = uploading || generating;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted">New Generation</p>
        <h1 className="text-3xl sm:text-4xl font-heading font-semibold mt-1">Upload & Generate</h1>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Drop zone */}
        <div>
          {!file ? (
            <label
              data-testid="dropzone"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`block rounded-3xl p-12 sm:p-16 text-center cursor-pointer transition-all ${
                dragOver
                  ? "bg-violet-50 ring-2 ring-violet-300"
                  : "bg-zinc-50 hover:bg-zinc-100 border-2 border-dashed border-zinc-300 hover:border-violet-400/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                className="hidden"
                data-testid="file-input"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="w-16 h-16 rounded-2xl bg-brand-gradient-soft border border-zinc-200 mx-auto flex items-center justify-center mb-5">
                <UploadIcon size={26} className="text-violet-700" />
              </div>
              <p className="text-lg font-heading font-medium">Drop your video here</p>
              <p className="text-secondary text-sm mt-2">MP4, MOV or WEBM · up to 100MB</p>
              <Button type="button" data-testid="browse-btn" onClick={() => fileInputRef.current?.click()} className="btn-gradient rounded-full mt-6 px-6">
                Browse files
              </Button>
            </label>
          ) : (
            <div className="glass rounded-3xl p-5">
              <div className="aspect-video rounded-2xl overflow-hidden bg-black relative" data-testid="video-preview">
                <video src={previewUrl} controls className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Film size={16} className="text-violet-700" />
                  <div className="min-w-0">
                    <p className="text-sm truncate" data-testid="file-name">{file.name}</p>
                    <p className="text-xs text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                <button onClick={clear} data-testid="clear-btn" className="text-secondary hover:text-zinc-900 p-2">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="glass rounded-3xl p-6 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted mb-2">Target model</p>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger data-testid="model-select" className="bg-zinc-100 border-zinc-200 text-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                {MODELS.map(m => <SelectItem key={m} value={m} data-testid={`model-opt-${m}`}>{m.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted mb-2">Style preset</p>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger data-testid="style-select" className="bg-zinc-100 border-zinc-200 text-zinc-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-900">
                {STYLES.map(s => <SelectItem key={s} value={s} data-testid={`style-opt-${s}`}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-2 text-xs text-muted bg-zinc-100 rounded-xl p-3 border border-zinc-200">
            <p>Each generation uses <span className="text-cyan-700 font-mono">1 credit</span>. Larger videos may take longer to analyze.</p>
          </div>

          <Button
            onClick={onGenerate}
            disabled={!file || busy}
            data-testid="generate-btn"
            className="btn-gradient w-full h-12 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {uploading ? "Uploading…" : generating ? "Analyzing with Gemini 3 Pro…" : (<><Sparkles size={16} className="mr-2" /> Generate Prompt</>)}
          </Button>
          {busy && (
            <div className="w-full h-1 rounded-full bg-zinc-100 overflow-hidden">
              <div className="h-full bg-brand-gradient animate-shimmer" style={{ backgroundSize: "200% 100%" }} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

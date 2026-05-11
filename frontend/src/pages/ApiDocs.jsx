import React, { useEffect, useState } from "react";
import MarketingLayout from "@/components/MarketingLayout";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Plus, Trash2, Key } from "lucide-react";
import { toast } from "sonner";

const ENDPOINTS = [
  { method: "POST", path: "/api/upload/video", desc: "Upload a video file (multipart/form-data)" },
  { method: "POST", path: "/api/generate-prompt", desc: "Generate prompt from a video_id" },
  { method: "GET",  path: "/api/generations",   desc: "List your generations" },
  { method: "GET",  path: "/api/generations/:id", desc: "Get a single generation" },
  { method: "POST", path: "/api/save-prompt",   desc: "Save a generation to your library" },
  { method: "GET",  path: "/api/saved-prompts", desc: "List saved prompts" },
  { method: "GET",  path: "/api/user/credits",  desc: "Get current credits and plan" },
];

const CURL = `curl -X POST "$API/api/generate-prompt" \\
  -H "Authorization: Bearer $VTP_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "video_id": "vid_xxx",
    "selected_model": "veo",
    "style_preset": "cinematic"
  }'`;

export default function ApiDocs() {
  const { user } = useAuth();
  const [keys, setKeys] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState(null);

  const load = async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/api-keys");
      setKeys(data);
    } catch {}
  };

  useEffect(() => { load(); }, [user]);

  const create = async () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    try {
      const { data } = await api.post("/api-keys/create", { name });
      setNewKey(data);
      setName("");
      await load();
    } catch {
      toast.error("Create failed");
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/api-keys/${id}`);
      setKeys((p) => p.filter(k => k.api_key_id !== id));
      toast.success("Key revoked");
    } catch { toast.error("Delete failed"); }
  };

  const copy = async (t) => { await navigator.clipboard.writeText(t); toast.success("Copied"); };

  return (
    <MarketingLayout>
      <section className="py-16 max-w-5xl mx-auto px-5 lg:px-8">
        <p className="chip">Developer API</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4">Programmatic <span className="gradient-text">video-to-prompt</span>.</h1>
        <p className="text-secondary mt-4 max-w-2xl">REST API to bring VideosToPrompt into your pipeline. Available on Pro and Studio plans.</p>

        {user && (
          <div className="glass rounded-2xl p-6 mt-10" data-testid="api-keys-section">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-heading">Your API keys</h2>
                <p className="text-secondary text-sm">Treat keys like passwords. Don't commit them to git.</p>
              </div>
              <Button onClick={() => setCreating(true)} data-testid="create-key-btn" className="btn-gradient rounded-full">
                <Plus size={14} className="mr-1" /> Create key
              </Button>
            </div>
            {keys.length === 0 ? (
              <p className="text-secondary text-sm mt-6">No keys yet.</p>
            ) : (
              <div className="mt-5 divide-y divide-zinc-200">
                {keys.map(k => (
                  <div key={k.api_key_id} className="py-3 flex items-center justify-between" data-testid={`api-key-${k.api_key_id}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{k.name}</p>
                      <p className="text-xs font-mono text-muted">{k.key_prefix}…</p>
                    </div>
                    <button onClick={() => remove(k.api_key_id)} data-testid={`revoke-${k.api_key_id}`} className="text-secondary hover:text-rose-600 p-2"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-10">
          <h2 className="text-2xl font-heading">Endpoints</h2>
          <div className="mt-5 glass rounded-2xl overflow-hidden">
            <div className="divide-y divide-zinc-200">
              {ENDPOINTS.map((e) => (
                <div key={e.path + e.method} className="px-5 py-4 flex items-center gap-4">
                  <span className={`text-[10px] font-mono px-2 py-1 rounded ${e.method === "POST" ? "bg-violet-100 text-violet-700" : "bg-cyan-100 text-cyan-700"}`}>{e.method}</span>
                  <code className="text-sm font-mono">{e.path}</code>
                  <span className="text-xs text-secondary ml-auto hidden sm:block">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-heading">Quick start</h2>
          <div className="mt-4 relative">
            <pre className="bg-zinc-100 border border-zinc-200 rounded-2xl p-5 text-xs font-mono text-secondary overflow-x-auto" data-testid="curl-snippet">{CURL}</pre>
            <button onClick={() => copy(CURL)} data-testid="copy-curl-btn" className="absolute top-3 right-3 text-secondary hover:text-zinc-900"><Copy size={14} /></button>
          </div>
        </div>
      </section>

      <Dialog open={creating} onOpenChange={(v) => { setCreating(v); if (!v) setNewKey(null); }}>
        <DialogContent className="bg-white border-zinc-200 text-zinc-900">
          <DialogHeader><DialogTitle>{newKey ? "Save your new key" : "Create API key"}</DialogTitle></DialogHeader>
          {!newKey ? (
            <div className="space-y-3">
              <p className="text-secondary text-sm">Name this key for your own reference.</p>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production server" data-testid="new-key-name" className="bg-zinc-100 border-zinc-200 text-zinc-900" />
              <Button onClick={create} data-testid="confirm-create-key" className="btn-gradient w-full rounded-full"><Key size={14} className="mr-1" /> Create</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-secondary text-sm">Copy this key now — you won't see it again.</p>
              <div className="bg-zinc-100 border border-zinc-200 rounded-lg p-3 font-mono text-xs break-all" data-testid="new-key-value">{newKey.key}</div>
              <Button onClick={() => copy(newKey.key)} data-testid="copy-new-key" className="w-full bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full">Copy</Button>
              <Button onClick={() => { setNewKey(null); setCreating(false); }} className="w-full btn-gradient rounded-full">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MarketingLayout>
  );
}

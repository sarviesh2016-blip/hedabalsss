import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Bookmark, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function SavedPrompts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/saved-prompts");
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/saved-prompts/${id}`);
      setItems((p) => p.filter(i => i.saved_id !== id));
      toast.success("Removed");
    } catch {
      toast.error("Delete failed");
    }
  };

  const copy = async (t) => {
    await navigator.clipboard.writeText(t);
    toast.success("Copied");
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted">Library</p>
        <h1 className="text-3xl sm:text-4xl font-heading font-semibold mt-1">Saved Prompts</h1>
        <p className="text-secondary text-sm mt-2">Your favorite generations, one click away.</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-40 rounded-2xl bg-zinc-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-3xl p-14 text-center" data-testid="empty-saved">
          <div className="w-16 h-16 rounded-2xl bg-brand-gradient-soft border border-zinc-200 mx-auto flex items-center justify-center mb-4">
            <Bookmark size={22} className="text-violet-700" />
          </div>
          <p className="font-medium">No saved prompts yet</p>
          <p className="text-secondary text-sm mt-1">Save a generation to access it here anytime.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((s) => (
            <div key={s.saved_id} className="glass rounded-2xl p-5 flex flex-col" data-testid={`saved-${s.saved_id}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-medium leading-snug flex-1">{s.title}</h3>
                <button onClick={() => remove(s.saved_id)} data-testid={`delete-saved-${s.saved_id}`} className="text-secondary hover:text-rose-600">
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-xs text-muted mb-3">{new Date(s.created_at).toLocaleDateString()}</p>
              <p className="font-mono text-xs text-secondary leading-relaxed line-clamp-5 flex-1">{s.snippet}</p>
              <div className="mt-4 pt-4 border-t border-zinc-200 flex gap-2">
                <Button size="sm" onClick={() => copy(s.output?.shortPrompt || s.snippet)} data-testid={`copy-saved-${s.saved_id}`} className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full text-xs">
                  <Copy size={12} className="mr-1" /> Copy short
                </Button>
                <Button size="sm" onClick={() => copy(s.output?.detailedPrompt || "")} data-testid={`copy-detailed-${s.saved_id}`} className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full text-xs">
                  Detailed
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

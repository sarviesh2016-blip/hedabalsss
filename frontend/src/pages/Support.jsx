import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CreateTicketDialog from "@/components/CreateTicketDialog";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LifeBuoy, MessageSquare, Plus, Clock, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_COLOR = {
  open: "bg-amber-100 text-amber-800 border-amber-200",
  answered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState(null);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/tickets");
      setTickets(Array.isArray(data) ? data : []);
    } catch { setTickets([]); }
  };

  useEffect(() => { load(); }, []);

  const openTicket = async (id) => {
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setActive(data);
      setReply("");
    } catch { toast.error("Could not open ticket"); }
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/tickets/${active.ticket_id}/reply`, { body: reply.trim() });
      setActive(data);
      setReply("");
      await load();
    } catch { toast.error("Reply failed"); }
    finally { setSending(false); }
  };

  return (
    <DashboardLayout>
      <CreateTicketDialog open={creating} onOpenChange={(o) => { setCreating(o); if (!o) load(); }} />

      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-violet-700">Support</p>
          <h1 className="text-3xl sm:text-4xl font-heading font-semibold mt-1 flex items-center gap-2">
            <LifeBuoy size={26} className="text-violet-700" /> Your tickets
          </h1>
          <p className="text-secondary text-sm mt-2">Updates from our team appear here. Bookmark this page.</p>
        </div>
        <Button
          onClick={() => setCreating(true)}
          data-testid="dash-new-ticket-btn"
          className="btn-gradient rounded-full h-11 px-5"
        >
          <Plus size={16} className="mr-1" /> New ticket
        </Button>
      </div>

      {!active && (
        <>
          {tickets === null && (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          )}
          {tickets && tickets.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center" data-testid="support-empty">
              <MessageSquare className="mx-auto mb-3 text-violet-700" size={28} />
              <p className="text-secondary">You don't have any open tickets. Need a hand?</p>
              <Button onClick={() => setCreating(true)} className="btn-gradient rounded-full mt-5">
                Open your first ticket
              </Button>
            </div>
          )}
          {tickets && tickets.length > 0 && (
            <div className="space-y-3" data-testid="support-tickets-list">
              {tickets.map(t => (
                <button
                  key={t.ticket_id}
                  onClick={() => openTicket(t.ticket_id)}
                  data-testid={`support-ticket-${t.ticket_id}`}
                  className="glass rounded-2xl p-5 text-left w-full hover:bg-zinc-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{t.subject || "(no subject)"}</p>
                      <p className="text-xs text-secondary mt-0.5">
                        {(t.replies || []).length} {(t.replies || []).length === 1 ? "message" : "messages"} · last update {t.updated_at ? new Date(t.updated_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2.5 py-0.5 whitespace-nowrap ${STATUS_COLOR[t.status] || STATUS_COLOR.closed}`}>
                      {t.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {active && (
        <div data-testid="support-ticket-detail">
          <button onClick={() => setActive(null)} className="text-sm text-secondary hover:text-zinc-900 inline-flex items-center gap-1 mb-4">
            <ArrowLeft size={14} /> All tickets
          </button>
          <div className="glass-strong rounded-2xl p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted">{active.ticket_id}</p>
                <h2 className="text-2xl font-heading font-medium mt-1">{active.subject}</h2>
              </div>
              <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2.5 py-0.5 ${STATUS_COLOR[active.status] || STATUS_COLOR.closed}`}>
                {active.status}
              </span>
            </div>

            <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 pb-2" data-testid="support-thread">
              {(active.replies || []).map(r => {
                const mine = r.author_role === "user" && r.author_id === user?.user_id;
                const isAdmin = r.author_role === "admin";
                return (
                  <div
                    key={r.reply_id}
                    className={`rounded-xl p-4 border ${isAdmin ? "bg-violet-50 border-violet-200" : "bg-zinc-50 border-zinc-200"}`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className={isAdmin ? "text-violet-700 font-medium" : "text-zinc-700 font-medium"}>
                        {isAdmin ? "Support team" : (mine ? "You" : r.author_name)}
                      </span>
                      <span className="text-muted flex items-center gap-1"><Clock size={10} />{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-zinc-800 whitespace-pre-wrap break-words">{r.body}</p>
                  </div>
                );
              })}
            </div>

            {active.status !== "closed" && (
              <div className="border-t border-zinc-200 pt-4 mt-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted">Reply</p>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  data-testid="support-reply-input"
                  rows={4}
                  className="bg-white border-zinc-200"
                  placeholder="Add more details or follow up…"
                />
                <Button
                  onClick={sendReply}
                  disabled={!reply.trim() || sending}
                  data-testid="support-reply-send"
                  className="btn-gradient rounded-full w-full"
                >
                  <Send size={14} className="mr-1" /> {sending ? "Sending…" : "Send reply"}
                </Button>
              </div>
            )}
            {active.status === "closed" && (
              <p className="text-secondary text-sm mt-4 border-t border-zinc-200 pt-4">
                This ticket is closed. Need more help? Open a new one.
              </p>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

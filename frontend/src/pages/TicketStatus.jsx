import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import MarketingLayout from "@/components/MarketingLayout";
import { api } from "@/lib/api";
import { ArrowLeft, MessageSquare, Clock } from "lucide-react";

export default function TicketStatus() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/tickets/public/${id}`);
        setTicket(data);
      } catch (e) {
        setErr(e?.response?.data?.detail || "Ticket not found");
      }
    })();
  }, [id]);

  if (err) {
    return (
      <MarketingLayout>
        <section className="py-24 max-w-2xl mx-auto px-5 text-center">
          <p className="chip mb-4">404</p>
          <h1 className="text-3xl font-heading font-semibold">Ticket not found</h1>
          <p className="text-secondary mt-3">{err}</p>
          <Link to="/contact" className="inline-flex items-center gap-1 text-sm text-violet-700 mt-6 hover:underline">
            <ArrowLeft size={14} /> Back to contact
          </Link>
        </section>
      </MarketingLayout>
    );
  }
  if (!ticket) {
    return (
      <MarketingLayout>
        <div className="py-24 flex justify-center">
          <div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      </MarketingLayout>
    );
  }

  const statusColor = {
    open: "bg-amber-100 text-amber-800 border-amber-200",
    answered: "bg-emerald-100 text-emerald-800 border-emerald-200",
    closed: "bg-zinc-100 text-zinc-700 border-zinc-200",
  }[ticket.status] || "bg-zinc-100 text-zinc-700 border-zinc-200";

  return (
    <MarketingLayout>
      <section className="py-16 max-w-3xl mx-auto px-5 lg:px-8" data-testid="ticket-status-page">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-secondary hover:text-zinc-900">
          <ArrowLeft size={14} /> Home
        </Link>

        <div className="mt-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted font-mono">{ticket.ticket_id}</p>
            <h1 className="text-3xl sm:text-4xl font-heading font-semibold mt-2" data-testid="ticket-subject">{ticket.subject}</h1>
            <p className="text-secondary text-sm mt-2 flex items-center gap-2">
              <MessageSquare size={13} /> Opened by {ticket.name || "you"} &lt;{ticket.email}&gt;
            </p>
          </div>
          <span className={`text-xs uppercase tracking-widest border rounded-full px-3 py-1 ${statusColor}`} data-testid="ticket-status">
            {ticket.status}
          </span>
        </div>

        <div className="mt-10 space-y-4" data-testid="ticket-thread">
          {(ticket.replies || []).map((r) => {
            const admin = r.author_role === "admin";
            return (
              <div
                key={r.reply_id}
                className={`rounded-2xl p-5 border ${admin ? "bg-violet-50 border-violet-200" : "bg-white border-zinc-200"}`}
                data-testid={`reply-${r.reply_id}`}
              >
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className={admin ? "text-violet-700 font-medium" : "text-zinc-700 font-medium"}>
                    {admin ? "Support team" : r.author_name || "You"}
                  </span>
                  <span className="text-muted flex items-center gap-1"><Clock size={11} />{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-zinc-800 whitespace-pre-wrap break-words">{r.body}</p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted mt-10">
          Bookmark this page to check for updates — we'll post replies here as soon as the team responds.
        </p>
      </section>
    </MarketingLayout>
  );
}

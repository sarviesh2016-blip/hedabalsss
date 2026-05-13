import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, MessageSquare } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Lightweight ticket creation modal — used from the landing page and anywhere
 * a "Need help?" CTA is shown. Posts to /api/contact which creates a ticket
 * server-side (auto-linked to the user_id if logged in), then shows the user
 * their ticket id + a link to track it.
 */
export default function CreateTicketDialog({ open, onOpenChange, defaultSubject = "" }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", subject: defaultSubject, message: "" });
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState(null); // { ticket_id }

  // Prefill from auth context when the dialog opens
  useEffect(() => {
    if (open && user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name || "",
        email: f.email || user.email || "",
      }));
    }
  }, [open, user]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Name, email and message are required");
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post("/contact", {
        ...form,
        subject: form.subject || "Support request",
      });
      setCreated(data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create ticket");
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setCreated(null);
    setForm({ name: "", email: "", subject: defaultSubject, message: "" });
  };

  const close = () => {
    onOpenChange(false);
    // delay reset so close animation looks clean
    setTimeout(reset, 250);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="bg-white border-zinc-200" data-testid="create-ticket-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-violet-700" />
            {created ? "Ticket created" : "Open a support ticket"}
          </DialogTitle>
        </DialogHeader>

        {created ? (
          <div className="space-y-4" data-testid="ticket-created-view">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm flex gap-3 items-start">
              <CheckCircle2 size={18} className="text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <p className="text-emerald-900 font-medium">We've got your message.</p>
                <p className="text-emerald-800 text-xs mt-1">Bookmark your ticket page — our team will reply there.</p>
              </div>
            </div>
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 flex items-center justify-between gap-3">
              <code className="font-mono text-sm text-zinc-900 truncate" data-testid="created-ticket-id">{created.ticket_id}</code>
              <Button
                size="sm"
                onClick={() => { navigator.clipboard.writeText(created.ticket_id); toast.success("Ticket ID copied"); }}
                className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full h-8 text-xs"
                data-testid="copy-ticket-id-btn"
              >
                <Copy size={12} className="mr-1" /> Copy
              </Button>
            </div>
            <Link
              to={user ? `/support` : `/tickets/${created.ticket_id}`}
              className="btn-gradient rounded-full h-10 inline-flex items-center justify-center w-full text-sm"
              data-testid="view-ticket-btn"
              onClick={close}
            >
              {user ? "View in my tickets" : "View ticket"}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3" data-testid="create-ticket-form">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-secondary block mb-1">Your name</label>
                <Input data-testid="ticket-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-zinc-50 border-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-secondary block mb-1">Email</label>
                <Input data-testid="ticket-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-zinc-50 border-zinc-200" />
              </div>
            </div>
            <div>
              <label className="text-xs text-secondary block mb-1">Subject</label>
              <Input data-testid="ticket-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What's this about?" className="bg-zinc-50 border-zinc-200" />
            </div>
            <div>
              <label className="text-xs text-secondary block mb-1">Message</label>
              <Textarea data-testid="ticket-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={5} className="bg-zinc-50 border-zinc-200" placeholder="Tell us what you need help with…" />
            </div>
            <Button type="submit" disabled={sending} data-testid="ticket-submit" className="btn-gradient w-full rounded-full h-11">
              {sending ? "Sending…" : "Create ticket"}
            </Button>
            <p className="text-[11px] text-muted text-center">
              By submitting you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy</Link>.
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

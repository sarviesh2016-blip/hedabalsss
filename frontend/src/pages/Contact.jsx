import React, { useState } from "react";
import MarketingLayout from "@/components/MarketingLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      toast.success("Message sent — we'll be in touch.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (e) {
      toast.error(e?.response?.data?.detail?.[0]?.msg || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <MarketingLayout>
      <section className="py-16 max-w-5xl mx-auto px-5 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10">
          <div>
            <p className="chip">Contact</p>
            <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4">Let's <span className="gradient-text">talk</span>.</h1>
            <p className="text-secondary mt-4 max-w-md">Questions about pricing, partnerships, or just want to share a project? Drop us a line.</p>
            <div className="mt-10 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-violet-700" />
                <span className="text-secondary">hello@videostoprompt.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MessageSquare size={16} className="text-violet-700" />
                <span className="text-secondary">We read every message</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin size={16} className="text-violet-700" />
                <span className="text-secondary">Bengaluru, India · Remote-first</span>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-4" data-testid="contact-form">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted mb-2">Name</p>
                <Input data-testid="contact-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-zinc-100 border-zinc-200 text-zinc-900" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted mb-2">Email</p>
                <Input data-testid="contact-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-zinc-100 border-zinc-200 text-zinc-900" />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Subject</p>
              <Input data-testid="contact-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className="bg-zinc-100 border-zinc-200 text-zinc-900" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Message</p>
              <Textarea data-testid="contact-message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={6} className="bg-zinc-100 border-zinc-200 text-zinc-900" />
            </div>
            <Button type="submit" disabled={sending} data-testid="contact-submit" className="btn-gradient w-full rounded-full h-11">
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, IndianRupee, Film, AlertTriangle, KeyRound, Plus, Minus, Globe, BarChart3, Search, Mail, CheckCircle2, XCircle, MessageSquare, FileText, Send, Trash2, Image as ImageIcon, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [gens, setGens] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const [blogs, setBlogs] = useState([]);
  const [blogEdit, setBlogEdit] = useState(null); // null or { ...post } (new = {})
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [publicCfg, setPublicCfg] = useState({});
  const [keys, setKeys] = useState({});
  const [siteCfg, setSiteCfg] = useState({});
  const [keysForm, setKeysForm] = useState({
    razorpay_key_id: "", razorpay_key_secret: "",
    google_client_id: "", google_client_secret: "",
    gemini_api_key: "",
  });
  const [siteForm, setSiteForm] = useState({
    ga_measurement_id: "", gtm_id: "", fb_pixel_id: "",
    google_site_verification: "", bing_site_verification: "",
    seo_default_title: "", seo_default_description: "", og_image_url: "",
  });
  const [adjUser, setAdjUser] = useState(null);
  const [delta, setDelta] = useState(0);

  const loadAll = async () => {
    const [s, u, p, g, k, sc, m, t, b, pc] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/payments"),
      api.get("/admin/generations"),
      api.get("/admin/integration-keys"),
      api.get("/admin/site-config"),
      api.get("/admin/contact-messages"),
      api.get("/admin/tickets"),
      api.get("/admin/blogs"),
      api.get("/site-config"),
    ]);
    setStats(s.data); setUsers(u.data); setPayments(p.data); setGens(g.data);
    setKeys(k.data); setSiteCfg(sc.data || {}); setMessages(m.data || []);
    setTickets(t.data || []); setBlogs(b.data || []); setPublicCfg(pc.data || {});
  };

  const reloadCfgs = async () => {
    const [k, sc, pc] = await Promise.all([
      api.get("/admin/integration-keys"),
      api.get("/admin/site-config"),
      api.get("/site-config"),
    ]);
    setKeys(k.data); setSiteCfg(sc.data || {}); setPublicCfg(pc.data || {});
  };

  const reloadTickets = async () => {
    const { data } = await api.get("/admin/tickets");
    setTickets(data || []);
    if (activeTicket?.ticket_id) {
      try {
        const { data: d } = await api.get(`/admin/tickets/${activeTicket.ticket_id}`);
        setActiveTicket(d);
      } catch { /* ticket maybe deleted */ }
    }
  };

  const reloadBlogs = async () => {
    const { data } = await api.get("/admin/blogs");
    setBlogs(data || []);
  };

  const sendReply = async () => {
    if (!activeTicket || !replyBody.trim()) return;
    try {
      const { data } = await api.post(`/admin/tickets/${activeTicket.ticket_id}/reply`, { body: replyBody.trim(), set_status: "answered" });
      setActiveTicket(data);
      setReplyBody("");
      await reloadTickets();
      toast.success("Reply posted");
    } catch { toast.error("Reply failed"); }
  };

  const updateTicketStatus = async (status) => {
    if (!activeTicket) return;
    try {
      const { data } = await api.put(`/admin/tickets/${activeTicket.ticket_id}/status`, { status });
      setActiveTicket(data);
      await reloadTickets();
      toast.success(`Ticket ${status}`);
    } catch { toast.error("Update failed"); }
  };

  const saveBlog = async () => {
    if (!blogEdit?.title || !blogEdit?.body) {
      toast.error("Title and body are required"); return;
    }
    try {
      if (blogEdit.blog_id) {
        await api.put(`/admin/blogs/${blogEdit.blog_id}`, blogEdit);
      } else {
        await api.post("/admin/blogs", blogEdit);
      }
      setBlogEdit(null);
      await reloadBlogs();
      toast.success("Blog saved");
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const deleteBlog = async (blog_id) => {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      await api.delete(`/admin/blogs/${blog_id}`);
      await reloadBlogs();
      toast.success("Deleted");
    } catch { toast.error("Delete failed"); }
  };

  const uploadThumb = async (file) => {
    if (!file) return;
    setUploadingThumb(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/admin/blogs/upload-thumbnail", form, { headers: { "Content-Type": "multipart/form-data" } });
      setBlogEdit((b) => ({ ...(b || {}), thumbnail_url: data.thumbnail_url }));
      toast.success("Thumbnail uploaded");
    } catch (e) { toast.error(e?.response?.data?.detail || "Upload failed"); }
    finally { setUploadingThumb(false); }
  };

  useEffect(() => { loadAll().catch(() => toast.error("Admin load failed")); }, []);

  const saveKeys = async () => {
    const payload = {};
    Object.entries(keysForm).forEach(([k, v]) => { if (v) payload[k] = v; });
    if (Object.keys(payload).length === 0) { toast.message("Nothing to save"); return; }
    try {
      await api.put("/admin/integration-keys", payload);
      toast.success("Integration keys updated");
      setKeysForm({ razorpay_key_id: "", razorpay_key_secret: "", google_client_id: "", google_client_secret: "", gemini_api_key: "", groq_api_key: "" });
      await reloadCfgs();
    } catch { toast.error("Update failed"); }
  };

  const saveSiteCfg = async () => {
    const payload = {};
    Object.entries(siteForm).forEach(([k, v]) => { if (v) payload[k] = v; });
    if (Object.keys(payload).length === 0) { toast.message("Nothing to save"); return; }
    try {
      await api.put("/admin/site-config", payload);
      toast.success("Site config updated");
      setSiteForm({ ga_measurement_id: "", gtm_id: "", fb_pixel_id: "", google_site_verification: "", bing_site_verification: "", seo_default_title: "", seo_default_description: "", og_image_url: "" });
      await reloadCfgs();
    } catch { toast.error("Update failed"); }
  };

  const adjustCredits = async () => {
    try {
      await api.post("/admin/credits/adjust", { user_id: adjUser.user_id, delta: Number(delta) || 0, reason: "admin_adjust" });
      toast.success("Credits adjusted");
      setAdjUser(null); setDelta(0);
      const u = await api.get("/admin/users");
      setUsers(u.data);
    } catch { toast.error("Adjustment failed"); }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-violet-700">Admin</p>
        <h1 className="text-3xl sm:text-4xl font-heading font-semibold mt-1">Control Room</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Users", value: stats?.total_users ?? 0, icon: Users },
          { label: "Revenue (₹)", value: stats?.total_revenue_inr?.toLocaleString() ?? 0, icon: IndianRupee },
          { label: "Generations", value: stats?.total_generations ?? 0, icon: Film },
          { label: "Failed jobs", value: stats?.failed_jobs ?? 0, icon: AlertTriangle },
        ].map((s, i) => (
          <div key={i} className="glass rounded-2xl p-5" data-testid={`admin-stat-${i}`}>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted">{s.label}</p>
              <s.icon size={16} className="text-secondary" />
            </div>
            <p className="text-3xl font-heading font-semibold mt-3">{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-zinc-100 p-1 rounded-lg flex flex-wrap h-auto">
          <TabsTrigger value="users" data-testid="tab-users" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-secondary">Users</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-secondary">Payments</TabsTrigger>
          <TabsTrigger value="generations" data-testid="tab-gens" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-secondary">Generations</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-secondary">Integrations</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-secondary">Analytics &amp; SEO</TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-secondary">Messages</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-secondary">Tickets</TabsTrigger>
          <TabsTrigger value="blogs" data-testid="tab-blogs" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-secondary">Blogs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-5">
          <DataTable
            cols={["Name", "Email", "Plan", "Credits", ""]}
            grid="grid-cols-[1fr_1fr_80px_80px_120px]"
            rows={users.map(u => ({ key: u.user_id, cells: [
              <span className="truncate">{u.name}{u.role === "admin" && <span className="ml-2 text-violet-700 text-[10px]">ADMIN</span>}</span>,
              <span className="truncate text-secondary">{u.email}</span>,
              <span className="capitalize text-secondary">{u.plan}</span>,
              <span className="font-mono">{u.credits}</span>,
              <Button onClick={() => { setAdjUser(u); setDelta(0); }} data-testid={`adjust-${u.user_id}`} size="sm" className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full h-8 text-xs">Adjust</Button>,
            ], testid: `admin-user-${u.user_id}` }))}
          />
        </TabsContent>

        <TabsContent value="payments" className="mt-5">
          <DataTable
            cols={["Order", "User", "Type", "Amount", "Status"]}
            grid="grid-cols-[1fr_1fr_100px_100px_120px]"
            rows={payments.map(p => ({ key: p.payment_id, cells: [
              <span className="font-mono text-xs truncate">{p.razorpay_order_id}</span>,
              <span className="truncate text-secondary">{p.user_id}</span>,
              <span className="text-secondary capitalize">{p.type}</span>,
              <span className="font-mono">₹{(p.amount/100).toLocaleString()}</span>,
              <StatusBadge s={p.status} />,
            ] }))}
          />
        </TabsContent>

        <TabsContent value="generations" className="mt-5">
          <DataTable
            cols={["ID", "User", "Model", "Style", "Status"]}
            grid="grid-cols-[1fr_1fr_100px_100px_120px]"
            rows={gens.map(g => ({ key: g.generation_id, cells: [
              <span className="font-mono text-xs truncate">{g.generation_id}</span>,
              <span className="truncate text-secondary">{g.user_id}</span>,
              <span className="uppercase">{g.selected_model}</span>,
              <span className="text-secondary">{g.style_preset}</span>,
              <span className="text-[10px] uppercase text-secondary">{g.status}</span>,
            ] }))}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-5">
          {messages.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center" data-testid="messages-empty">
              <Mail className="mx-auto mb-3 text-violet-700" size={28} />
              <p className="text-secondary text-sm">No contact messages yet.</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="messages-list">
              {messages.map(m => (
                <div key={m.message_id || m.created_at} className="glass rounded-2xl p-5" data-testid={`msg-${m.message_id || m.created_at}`}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-zinc-900 truncate">{m.name || "Anonymous"}</span>
                        <span className="text-xs text-secondary truncate">&lt;{m.email}&gt;</span>
                      </div>
                      <p className="text-sm font-medium text-zinc-800 mt-1 truncate">{m.subject || "(no subject)"}</p>
                    </div>
                    <span className="text-[11px] text-muted whitespace-nowrap">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                  <p className="text-sm text-secondary whitespace-pre-wrap break-words">{m.message}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="integrations" className="mt-5 space-y-6">
          <Card icon={KeyRound} title="Integration keys" desc="Override .env-level keys. Leave blank to keep current values.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Razorpay Key ID" current={keys.razorpay_key_id || "(not set)"} testid="key-rzp-id" configured={!!keys.razorpay_key_id}>
                <Input value={keysForm.razorpay_key_id} onChange={(e) => setKeysForm({...keysForm, razorpay_key_id: e.target.value})} placeholder="rzp_live_xxx" className="bg-white border-zinc-200" data-testid="input-rzp-id" />
              </Field>
              <Field label="Razorpay Key Secret" current={keys.razorpay_key_secret_masked || "(not set)"} testid="key-rzp-secret" configured={!!keys.razorpay_key_secret_masked}>
                <Input type="password" value={keysForm.razorpay_key_secret} onChange={(e) => setKeysForm({...keysForm, razorpay_key_secret: e.target.value})} placeholder="••••••••" className="bg-white border-zinc-200" data-testid="input-rzp-secret" />
              </Field>
              <Field label="Google OAuth Client ID" current={keys.google_client_id || "(not set)"} testid="key-google-id" configured={!!keys.google_client_id}>
                <Input value={keysForm.google_client_id} onChange={(e) => setKeysForm({...keysForm, google_client_id: e.target.value})} placeholder="xxx.apps.googleusercontent.com" className="bg-white border-zinc-200" data-testid="input-google-id" />
              </Field>
              <Field label="Google OAuth Client Secret" current={keys.google_client_secret_masked || "(not set)"} testid="key-google-secret" configured={!!keys.google_client_secret_masked}>
                <Input type="password" value={keysForm.google_client_secret} onChange={(e) => setKeysForm({...keysForm, google_client_secret: e.target.value})} placeholder="GOCSPX-xxx" className="bg-white border-zinc-200" data-testid="input-google-secret" />
              </Field>
              <Field label="Gemini API Key (override)" current={keys.gemini_api_key_masked || "(using EMERGENT_LLM_KEY)"} testid="key-gemini" configured={!!keys.gemini_api_key_masked}>
                <Input type="password" value={keysForm.gemini_api_key} onChange={(e) => setKeysForm({...keysForm, gemini_api_key: e.target.value})} placeholder="AIza... or sk-emergent-..." className="bg-white border-zinc-200" data-testid="input-gemini" />
              </Field>
              <Field label="Groq API Key (free-tier fallback)" current={keys.groq_api_key_masked || "(not set)"} testid="key-groq" configured={!!keys.groq_api_key_masked}>
                <Input type="password" value={keysForm.groq_api_key} onChange={(e) => setKeysForm({...keysForm, groq_api_key: e.target.value})} placeholder="gsk_..." className="bg-white border-zinc-200" data-testid="input-groq" />
              </Field>
            </div>
            <Button onClick={saveKeys} data-testid="save-keys-btn" className="btn-gradient rounded-full mt-6">Save integration keys</Button>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-5 space-y-6">
          <div className="glass rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3" data-testid="public-cfg-banner">
            <div className="text-sm">
              <p className="font-medium text-zinc-900">Live config (what visitors see)</p>
              <p className="text-secondary text-xs mt-0.5">Pinged from the public <span className="font-mono">/api/site-config</span> endpoint.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { k: "ga_measurement_id", label: "GA4" },
                { k: "gtm_id", label: "GTM" },
                { k: "fb_pixel_id", label: "Meta Pixel" },
                { k: "google_site_verification", label: "Google SC" },
                { k: "bing_site_verification", label: "Bing" },
                { k: "seo_default_title", label: "SEO Title" },
                { k: "og_image_url", label: "OG Image" },
              ].map(({ k, label }) => {
                const on = !!publicCfg?.[k];
                return (
                  <span
                    key={k}
                    data-testid={`live-indicator-${k}`}
                    className={`text-[10px] uppercase tracking-widest inline-flex items-center gap-1 px-2 py-1 rounded-full border ${
                      on ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                         : "text-zinc-500 bg-zinc-100 border-zinc-200"
                    }`}
                  >
                    {on ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {label}
                  </span>
                );
              })}
              <Button onClick={reloadCfgs} size="sm" className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full h-7 text-xs px-3" data-testid="refresh-live-cfg">Refresh</Button>
            </div>
          </div>

          <Card icon={BarChart3} title="Analytics" desc="Tracking IDs are injected into every page at load.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Google Analytics 4 (GA4)" current={siteCfg.ga_measurement_id || "(not set)"} testid="cfg-ga" configured={!!publicCfg.ga_measurement_id}>
                <Input value={siteForm.ga_measurement_id} onChange={(e) => setSiteForm({...siteForm, ga_measurement_id: e.target.value})} placeholder="G-XXXXXXX" className="bg-white border-zinc-200" data-testid="input-ga" />
              </Field>
              <Field label="Google Tag Manager" current={siteCfg.gtm_id || "(not set)"} testid="cfg-gtm" configured={!!publicCfg.gtm_id}>
                <Input value={siteForm.gtm_id} onChange={(e) => setSiteForm({...siteForm, gtm_id: e.target.value})} placeholder="GTM-XXXXXX" className="bg-white border-zinc-200" data-testid="input-gtm" />
              </Field>
              <Field label="Meta / Facebook Pixel" current={siteCfg.fb_pixel_id || "(not set)"} testid="cfg-fb" configured={!!publicCfg.fb_pixel_id}>
                <Input value={siteForm.fb_pixel_id} onChange={(e) => setSiteForm({...siteForm, fb_pixel_id: e.target.value})} placeholder="123456789012345" className="bg-white border-zinc-200" data-testid="input-fb" />
              </Field>
            </div>
          </Card>

          <Card icon={Search} title="Webmaster verification" desc="Verification meta tags injected into the document head.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Google Search Console" current={siteCfg.google_site_verification || "(not set)"} testid="cfg-gsc" configured={!!publicCfg.google_site_verification}>
                <Input value={siteForm.google_site_verification} onChange={(e) => setSiteForm({...siteForm, google_site_verification: e.target.value})} placeholder="content value of meta tag" className="bg-white border-zinc-200" data-testid="input-gsc" />
              </Field>
              <Field label="Bing Webmaster" current={siteCfg.bing_site_verification || "(not set)"} testid="cfg-bing" configured={!!publicCfg.bing_site_verification}>
                <Input value={siteForm.bing_site_verification} onChange={(e) => setSiteForm({...siteForm, bing_site_verification: e.target.value})} placeholder="content value of meta tag" className="bg-white border-zinc-200" data-testid="input-bing" />
              </Field>
            </div>
          </Card>

          <Card icon={Globe} title="SEO defaults" desc="Used for &lt;title&gt;, description, and Open Graph tags.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Default page title" current={siteCfg.seo_default_title || "(not set)"} testid="cfg-title" configured={!!publicCfg.seo_default_title}>
                <Input value={siteForm.seo_default_title} onChange={(e) => setSiteForm({...siteForm, seo_default_title: e.target.value})} placeholder="VideosToPrompt — ..." className="bg-white border-zinc-200" data-testid="input-title" />
              </Field>
              <Field label="OG image URL" current={siteCfg.og_image_url || "(not set)"} testid="cfg-og" configured={!!publicCfg.og_image_url}>
                <Input value={siteForm.og_image_url} onChange={(e) => setSiteForm({...siteForm, og_image_url: e.target.value})} placeholder="https://.../og.jpg" className="bg-white border-zinc-200" data-testid="input-og" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Default meta description" current={siteCfg.seo_default_description || "(not set)"} testid="cfg-desc" configured={!!publicCfg.seo_default_description}>
                  <Textarea value={siteForm.seo_default_description} onChange={(e) => setSiteForm({...siteForm, seo_default_description: e.target.value})} rows={3} className="bg-white border-zinc-200" data-testid="input-desc" />
                </Field>
              </div>
            </div>
          </Card>

          <Button onClick={saveSiteCfg} data-testid="save-site-cfg-btn" className="btn-gradient rounded-full">Save Analytics &amp; SEO</Button>
        </TabsContent>

        <TabsContent value="tickets" className="mt-5">
          {tickets.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center" data-testid="tickets-empty">
              <MessageSquare className="mx-auto mb-3 text-violet-700" size={28} />
              <p className="text-secondary text-sm">No support tickets yet.</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="tickets-list">
              {tickets.map(t => {
                const statusColor = {
                  open: "bg-amber-100 text-amber-800 border-amber-200",
                  answered: "bg-emerald-100 text-emerald-800 border-emerald-200",
                  closed: "bg-zinc-100 text-zinc-700 border-zinc-200",
                }[t.status] || "bg-zinc-100 text-zinc-700 border-zinc-200";
                return (
                  <button
                    key={t.ticket_id}
                    onClick={() => { setActiveTicket(t); setReplyBody(""); }}
                    data-testid={`ticket-row-${t.ticket_id}`}
                    className="glass rounded-2xl p-5 text-left w-full hover:bg-zinc-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900 truncate">{t.subject || "(no subject)"}</p>
                        <p className="text-xs text-secondary truncate mt-0.5">
                          {t.name || "Anonymous"} &lt;{t.email}&gt; · {(t.replies || []).length} {(t.replies || []).length === 1 ? "message" : "messages"}
                        </p>
                      </div>
                      <span className={`text-[10px] uppercase tracking-widest border rounded-full px-2.5 py-0.5 whitespace-nowrap ${statusColor}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">{t.updated_at ? new Date(t.updated_at).toLocaleString() : ""}</p>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blogs" className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-secondary">{blogs.length} post{blogs.length === 1 ? "" : "s"}</p>
            <Button
              onClick={() => setBlogEdit({ title: "", slug: "", excerpt: "", body: "", tag: "Post", thumbnail_url: "", published: true })}
              data-testid="new-blog-btn"
              className="btn-gradient rounded-full"
            >
              <Plus size={14} className="mr-1" /> New post
            </Button>
          </div>

          {blogs.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center" data-testid="blogs-empty">
              <FileText className="mx-auto mb-3 text-violet-700" size={28} />
              <p className="text-secondary text-sm">No blog posts yet — click "New post" to publish your first.</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="blogs-list">
              {blogs.map(b => (
                <div key={b.blog_id} className="glass rounded-2xl p-5 flex gap-4 items-start" data-testid={`blog-row-${b.blog_id}`}>
                  <div className="w-24 h-16 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0 flex items-center justify-center">
                    {b.thumbnail_url
                      ? <img src={b.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : <ImageIcon size={18} className="text-zinc-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="chip text-[10px]">{b.tag || "Post"}</span>
                      {!b.published && <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 uppercase tracking-widest">Draft</span>}
                    </div>
                    <p className="font-medium text-zinc-900 truncate">{b.title}</p>
                    <p className="text-xs text-secondary truncate mt-0.5">/blog/{b.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setBlogEdit({ ...b })} data-testid={`edit-blog-${b.blog_id}`} className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900 rounded-full h-8 text-xs">
                      <Pencil size={12} className="mr-1" /> Edit
                    </Button>
                    <Button size="sm" onClick={() => deleteBlog(b.blog_id)} data-testid={`delete-blog-${b.blog_id}`} className="bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded-full h-8 text-xs">
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!adjUser} onOpenChange={(v) => { if (!v) setAdjUser(null); }}>
        <DialogContent className="bg-white border-zinc-200 text-zinc-900">
          <DialogHeader><DialogTitle>Adjust credits — {adjUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-secondary text-sm">Current: <span className="font-mono">{adjUser?.credits}</span>. Use negative numbers to subtract.</p>
            <div className="flex gap-2">
              <Button onClick={() => setDelta(Number(delta) - 10)} className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900"><Minus size={14}/>10</Button>
              <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} data-testid="delta-input" className="bg-white border-zinc-200" />
              <Button onClick={() => setDelta(Number(delta) + 10)} className="bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-900"><Plus size={14}/>10</Button>
            </div>
            <Button onClick={adjustCredits} data-testid="confirm-adjust" className="btn-gradient w-full rounded-full">Apply</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket detail + reply */}
      <Dialog open={!!activeTicket} onOpenChange={(v) => { if (!v) { setActiveTicket(null); setReplyBody(""); } }}>
        <DialogContent className="bg-white border-zinc-200 text-zinc-900 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} className="text-violet-700" />
              {activeTicket?.subject || "Ticket"}
            </DialogTitle>
          </DialogHeader>
          {activeTicket && (
            <div className="space-y-4" data-testid="ticket-detail">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-mono text-secondary">{activeTicket.ticket_id}</span>
                <div className="flex gap-2 items-center">
                  <span className="text-secondary">Status:</span>
                  <select
                    value={activeTicket.status}
                    onChange={(e) => updateTicketStatus(e.target.value)}
                    data-testid="ticket-status-select"
                    className="text-xs border border-zinc-200 rounded-full px-2 py-1 bg-white"
                  >
                    <option value="open">open</option>
                    <option value="answered">answered</option>
                    <option value="closed">closed</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-secondary">From {activeTicket.name} &lt;{activeTicket.email}&gt;</p>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1" data-testid="ticket-thread">
                {(activeTicket.replies || []).map(r => {
                  const admin = r.author_role === "admin";
                  return (
                    <div key={r.reply_id} className={`rounded-xl p-4 border ${admin ? "bg-violet-50 border-violet-200" : "bg-zinc-50 border-zinc-200"}`}>
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className={admin ? "text-violet-700 font-medium" : "text-zinc-700 font-medium"}>
                          {admin ? "You (Support)" : r.author_name}
                        </span>
                        <span className="text-muted">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{r.body}</p>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-zinc-200 pt-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted">Reply</p>
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  data-testid="ticket-reply-body"
                  rows={4}
                  className="bg-zinc-50 border-zinc-200"
                  placeholder="Type your response…"
                />
                <Button onClick={sendReply} disabled={!replyBody.trim()} data-testid="ticket-reply-send" className="btn-gradient rounded-full w-full">
                  <Send size={14} className="mr-1" /> Send reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Blog editor */}
      <Dialog open={!!blogEdit} onOpenChange={(v) => { if (!v) setBlogEdit(null); }}>
        <DialogContent className="bg-white border-zinc-200 text-zinc-900 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={18} className="text-violet-700" />
              {blogEdit?.blog_id ? "Edit post" : "New post"}
            </DialogTitle>
          </DialogHeader>
          {blogEdit && (
            <div className="space-y-3" data-testid="blog-editor">
              <div>
                <label className="text-xs text-secondary block mb-1">Title</label>
                <Input value={blogEdit.title || ""} onChange={(e) => setBlogEdit({ ...blogEdit, title: e.target.value })} data-testid="blog-title-input" className="bg-zinc-50 border-zinc-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-secondary block mb-1">Slug (URL)</label>
                  <Input value={blogEdit.slug || ""} onChange={(e) => setBlogEdit({ ...blogEdit, slug: e.target.value })} data-testid="blog-slug-input" placeholder="auto from title" className="bg-zinc-50 border-zinc-200" />
                </div>
                <div>
                  <label className="text-xs text-secondary block mb-1">Tag</label>
                  <Input value={blogEdit.tag || ""} onChange={(e) => setBlogEdit({ ...blogEdit, tag: e.target.value })} data-testid="blog-tag-input" placeholder="Tutorial / Product / Craft" className="bg-zinc-50 border-zinc-200" />
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary block mb-1">Excerpt</label>
                <Textarea value={blogEdit.excerpt || ""} onChange={(e) => setBlogEdit({ ...blogEdit, excerpt: e.target.value })} rows={2} data-testid="blog-excerpt-input" className="bg-zinc-50 border-zinc-200" />
              </div>
              <div>
                <label className="text-xs text-secondary block mb-1">Thumbnail</label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-12 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                    {blogEdit.thumbnail_url
                      ? <img src={blogEdit.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      : <ImageIcon size={16} className="text-zinc-400" />}
                  </div>
                  <label className="text-xs text-violet-700 cursor-pointer hover:underline" data-testid="blog-thumb-label">
                    {uploadingThumb ? "Uploading…" : (blogEdit.thumbnail_url ? "Replace image" : "Upload image")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => uploadThumb(e.target.files?.[0])}
                      data-testid="blog-thumb-input"
                    />
                  </label>
                  {blogEdit.thumbnail_url && (
                    <button onClick={() => setBlogEdit({ ...blogEdit, thumbnail_url: "" })} className="text-xs text-red-700 hover:underline" data-testid="blog-thumb-clear">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-secondary block mb-1">Body (Markdown supported as plain text)</label>
                <Textarea value={blogEdit.body || ""} onChange={(e) => setBlogEdit({ ...blogEdit, body: e.target.value })} rows={10} data-testid="blog-body-input" className="bg-zinc-50 border-zinc-200 font-mono text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" data-testid="blog-published-label">
                <input
                  type="checkbox"
                  checked={!!blogEdit.published}
                  onChange={(e) => setBlogEdit({ ...blogEdit, published: e.target.checked })}
                  data-testid="blog-published-input"
                />
                Published (visible on /blog)
              </label>
              <Button onClick={saveBlog} data-testid="save-blog-btn" className="btn-gradient w-full rounded-full">
                {blogEdit.blog_id ? "Save changes" : "Publish post"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Card({ icon: Icon, title, desc, children }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={18} className="text-violet-700" />
        <h3 className="text-lg font-heading">{title}</h3>
      </div>
      <p className="text-secondary text-sm mb-6">{desc}</p>
      {children}
    </div>
  );
}

function Field({ label, current, children, testid, configured }) {
  const showStatus = configured !== undefined;
  return (
    <div data-testid={testid}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-muted">{label}</p>
        {showStatus && (
          <span
            data-testid={`${testid}-status`}
            className={`text-[10px] uppercase tracking-widest inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
              configured
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : "text-zinc-500 bg-zinc-100 border-zinc-200"
            }`}
          >
            {configured
              ? <><CheckCircle2 size={11} /> Detected</>
              : <><XCircle size={11} /> Not set</>}
          </span>
        )}
      </div>
      <p className="text-xs font-mono text-secondary mb-2 truncate">Current: {current}</p>
      {children}
    </div>
  );
}

function StatusBadge({ s }) {
  const map = {
    paid: "text-emerald-600", failed: "text-rose-600",
    created: "text-amber-700", processing: "text-cyan-700",
    completed: "text-emerald-600", queued: "text-amber-700",
  };
  return <span className={`text-[10px] uppercase ${map[s] || "text-secondary"}`}>{s}</span>;
}

function DataTable({ cols, grid, rows }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className={`grid ${grid} px-5 py-3 text-xs uppercase tracking-widest text-muted border-b border-zinc-200`}>
        {cols.map((c, i) => <div key={i}>{c}</div>)}
      </div>
      <div className="divide-y divide-zinc-200 max-h-[500px] overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-secondary text-sm">No data</div>
        ) : rows.map(r => (
          <div key={r.key} data-testid={r.testid} className={`grid ${grid} px-5 py-3 items-center text-sm`}>
            {r.cells.map((c, i) => <div key={i}>{c}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

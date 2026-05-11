import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, IndianRupee, Film, AlertTriangle, KeyRound, Plus, Minus, Globe, BarChart3, Search } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [gens, setGens] = useState([]);
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
    const [s, u, p, g, k, sc] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/payments"),
      api.get("/admin/generations"),
      api.get("/admin/integration-keys"),
      api.get("/admin/site-config"),
    ]);
    setStats(s.data); setUsers(u.data); setPayments(p.data); setGens(g.data);
    setKeys(k.data); setSiteCfg(sc.data || {});
  };

  useEffect(() => { loadAll().catch(() => toast.error("Admin load failed")); }, []);

  const saveKeys = async () => {
    const payload = {};
    Object.entries(keysForm).forEach(([k, v]) => { if (v) payload[k] = v; });
    if (Object.keys(payload).length === 0) { toast.message("Nothing to save"); return; }
    try {
      await api.put("/admin/integration-keys", payload);
      toast.success("Integration keys updated");
      setKeysForm({ razorpay_key_id: "", razorpay_key_secret: "", google_client_id: "", google_client_secret: "", gemini_api_key: "" });
      const k = await api.get("/admin/integration-keys");
      setKeys(k.data);
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
      const sc = await api.get("/admin/site-config");
      setSiteCfg(sc.data || {});
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

        <TabsContent value="integrations" className="mt-5 space-y-6">
          <Card icon={KeyRound} title="Integration keys" desc="Override .env-level keys. Leave blank to keep current values.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Razorpay Key ID" current={keys.razorpay_key_id || "(not set)"} testid="key-rzp-id">
                <Input value={keysForm.razorpay_key_id} onChange={(e) => setKeysForm({...keysForm, razorpay_key_id: e.target.value})} placeholder="rzp_live_xxx" className="bg-white border-zinc-200" data-testid="input-rzp-id" />
              </Field>
              <Field label="Razorpay Key Secret" current={keys.razorpay_key_secret_masked || "(not set)"} testid="key-rzp-secret">
                <Input type="password" value={keysForm.razorpay_key_secret} onChange={(e) => setKeysForm({...keysForm, razorpay_key_secret: e.target.value})} placeholder="••••••••" className="bg-white border-zinc-200" data-testid="input-rzp-secret" />
              </Field>
              <Field label="Google OAuth Client ID" current={keys.google_client_id || "(not set)"} testid="key-google-id">
                <Input value={keysForm.google_client_id} onChange={(e) => setKeysForm({...keysForm, google_client_id: e.target.value})} placeholder="xxx.apps.googleusercontent.com" className="bg-white border-zinc-200" data-testid="input-google-id" />
              </Field>
              <Field label="Google OAuth Client Secret" current={keys.google_client_secret_masked || "(not set)"} testid="key-google-secret">
                <Input type="password" value={keysForm.google_client_secret} onChange={(e) => setKeysForm({...keysForm, google_client_secret: e.target.value})} placeholder="GOCSPX-xxx" className="bg-white border-zinc-200" data-testid="input-google-secret" />
              </Field>
              <Field label="Gemini API Key (override)" current={keys.gemini_api_key_masked || "(using EMERGENT_LLM_KEY)"} testid="key-gemini">
                <Input type="password" value={keysForm.gemini_api_key} onChange={(e) => setKeysForm({...keysForm, gemini_api_key: e.target.value})} placeholder="AIza... or sk-emergent-..." className="bg-white border-zinc-200" data-testid="input-gemini" />
              </Field>
            </div>
            <Button onClick={saveKeys} data-testid="save-keys-btn" className="btn-gradient rounded-full mt-6">Save integration keys</Button>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-5 space-y-6">
          <Card icon={BarChart3} title="Analytics" desc="Tracking IDs are injected into every page at load.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Google Analytics 4 (GA4)" current={siteCfg.ga_measurement_id || "(not set)"} testid="cfg-ga">
                <Input value={siteForm.ga_measurement_id} onChange={(e) => setSiteForm({...siteForm, ga_measurement_id: e.target.value})} placeholder="G-XXXXXXX" className="bg-white border-zinc-200" data-testid="input-ga" />
              </Field>
              <Field label="Google Tag Manager" current={siteCfg.gtm_id || "(not set)"} testid="cfg-gtm">
                <Input value={siteForm.gtm_id} onChange={(e) => setSiteForm({...siteForm, gtm_id: e.target.value})} placeholder="GTM-XXXXXX" className="bg-white border-zinc-200" data-testid="input-gtm" />
              </Field>
              <Field label="Meta / Facebook Pixel" current={siteCfg.fb_pixel_id || "(not set)"} testid="cfg-fb">
                <Input value={siteForm.fb_pixel_id} onChange={(e) => setSiteForm({...siteForm, fb_pixel_id: e.target.value})} placeholder="123456789012345" className="bg-white border-zinc-200" data-testid="input-fb" />
              </Field>
            </div>
          </Card>

          <Card icon={Search} title="Webmaster verification" desc="Verification meta tags injected into the document head.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Google Search Console" current={siteCfg.google_site_verification || "(not set)"} testid="cfg-gsc">
                <Input value={siteForm.google_site_verification} onChange={(e) => setSiteForm({...siteForm, google_site_verification: e.target.value})} placeholder="content value of meta tag" className="bg-white border-zinc-200" data-testid="input-gsc" />
              </Field>
              <Field label="Bing Webmaster" current={siteCfg.bing_site_verification || "(not set)"} testid="cfg-bing">
                <Input value={siteForm.bing_site_verification} onChange={(e) => setSiteForm({...siteForm, bing_site_verification: e.target.value})} placeholder="content value of meta tag" className="bg-white border-zinc-200" data-testid="input-bing" />
              </Field>
            </div>
          </Card>

          <Card icon={Globe} title="SEO defaults" desc="Used for &lt;title&gt;, description, and Open Graph tags.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Default page title" current={siteCfg.seo_default_title || "(not set)"} testid="cfg-title">
                <Input value={siteForm.seo_default_title} onChange={(e) => setSiteForm({...siteForm, seo_default_title: e.target.value})} placeholder="VideosToPrompt — ..." className="bg-white border-zinc-200" data-testid="input-title" />
              </Field>
              <Field label="OG image URL" current={siteCfg.og_image_url || "(not set)"} testid="cfg-og">
                <Input value={siteForm.og_image_url} onChange={(e) => setSiteForm({...siteForm, og_image_url: e.target.value})} placeholder="https://.../og.jpg" className="bg-white border-zinc-200" data-testid="input-og" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Default meta description" current={siteCfg.seo_default_description || "(not set)"} testid="cfg-desc">
                  <Textarea value={siteForm.seo_default_description} onChange={(e) => setSiteForm({...siteForm, seo_default_description: e.target.value})} rows={3} className="bg-white border-zinc-200" data-testid="input-desc" />
                </Field>
              </div>
            </div>
          </Card>

          <Button onClick={saveSiteCfg} data-testid="save-site-cfg-btn" className="btn-gradient rounded-full">Save Analytics &amp; SEO</Button>
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

function Field({ label, current, children, testid }) {
  return (
    <div data-testid={testid}>
      <p className="text-xs uppercase tracking-widest text-muted mb-2">{label}</p>
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

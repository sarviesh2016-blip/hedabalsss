import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, IndianRupee, Film, AlertTriangle, KeyRound, Plus, Minus } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [gens, setGens] = useState([]);
  const [keys, setKeys] = useState({});
  const [keysForm, setKeysForm] = useState({ razorpay_key_id: "", razorpay_key_secret: "", google_client_id: "" });
  const [adjUser, setAdjUser] = useState(null);
  const [delta, setDelta] = useState(0);

  const loadAll = async () => {
    const [s, u, p, g, k] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/payments"),
      api.get("/admin/generations"),
      api.get("/admin/integration-keys"),
    ]);
    setStats(s.data);
    setUsers(u.data);
    setPayments(p.data);
    setGens(g.data);
    setKeys(k.data);
  };

  useEffect(() => { loadAll().catch(e => toast.error("Admin load failed")); }, []);

  const saveKeys = async () => {
    const payload = {};
    Object.entries(keysForm).forEach(([k, v]) => { if (v) payload[k] = v; });
    try {
      await api.put("/admin/integration-keys", payload);
      toast.success("Integration keys updated");
      setKeysForm({ razorpay_key_id: "", razorpay_key_secret: "", google_client_id: "" });
      const k = await api.get("/admin/integration-keys");
      setKeys(k.data);
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
        <p className="text-xs uppercase tracking-widest text-cyan-300">Admin</p>
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
        <TabsList className="bg-white/5 p-1 rounded-lg">
          <TabsTrigger value="users" data-testid="tab-users" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-secondary">Users</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-secondary">Payments</TabsTrigger>
          <TabsTrigger value="generations" data-testid="tab-gens" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-secondary">Generations</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-secondary">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-5">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_80px_80px_120px] px-5 py-3 text-xs uppercase tracking-widest text-muted border-b border-white/5">
              <div>Name</div><div>Email</div><div>Plan</div><div>Credits</div><div></div>
            </div>
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {users.map(u => (
                <div key={u.user_id} className="grid grid-cols-[1fr_1fr_80px_80px_120px] px-5 py-3 items-center text-sm" data-testid={`admin-user-${u.user_id}`}>
                  <div className="truncate">{u.name}{u.role === "admin" && <span className="ml-2 text-cyan-300 text-[10px]">ADMIN</span>}</div>
                  <div className="truncate text-secondary">{u.email}</div>
                  <div className="capitalize text-secondary">{u.plan}</div>
                  <div className="font-mono">{u.credits}</div>
                  <div>
                    <Button onClick={() => { setAdjUser(u); setDelta(0); }} data-testid={`adjust-${u.user_id}`} size="sm" className="bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full h-8 text-xs">Adjust</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-5">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_100px_100px_120px] px-5 py-3 text-xs uppercase tracking-widest text-muted border-b border-white/5">
              <div>Order</div><div>User</div><div>Type</div><div>Amount</div><div>Status</div>
            </div>
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {payments.map(p => (
                <div key={p.payment_id} className="grid grid-cols-[1fr_1fr_100px_100px_120px] px-5 py-3 items-center text-sm">
                  <div className="font-mono text-xs truncate">{p.razorpay_order_id}</div>
                  <div className="truncate text-secondary">{p.user_id}</div>
                  <div className="text-secondary capitalize">{p.type}</div>
                  <div className="font-mono">₹{(p.amount/100).toLocaleString()}</div>
                  <div><span className={`text-[10px] uppercase ${p.status === "paid" ? "text-emerald-400" : p.status === "failed" ? "text-rose-400" : "text-amber-300"}`}>{p.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="generations" className="mt-5">
          <div className="glass rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_100px_100px_120px] px-5 py-3 text-xs uppercase tracking-widest text-muted border-b border-white/5">
              <div>ID</div><div>User</div><div>Model</div><div>Style</div><div>Status</div>
            </div>
            <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
              {gens.map(g => (
                <div key={g.generation_id} className="grid grid-cols-[1fr_1fr_100px_100px_120px] px-5 py-3 items-center text-sm">
                  <div className="font-mono text-xs truncate">{g.generation_id}</div>
                  <div className="truncate text-secondary">{g.user_id}</div>
                  <div className="uppercase">{g.selected_model}</div>
                  <div className="text-secondary">{g.style_preset}</div>
                  <div><span className="text-[10px] uppercase text-secondary">{g.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="mt-5">
          <div className="glass rounded-2xl p-6" data-testid="integrations-panel">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound size={18} className="text-violet-300" />
              <h3 className="text-lg font-heading">Integration keys</h3>
            </div>
            <p className="text-secondary text-sm mb-6">Override environment-level keys. Leave blank to keep current values.</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Razorpay Key ID" current={keys.razorpay_key_id || "(not set)"} testid="key-rzp-id">
                <Input value={keysForm.razorpay_key_id} onChange={(e) => setKeysForm({...keysForm, razorpay_key_id: e.target.value})} placeholder="rzp_live_xxx" className="bg-black/40 border-white/10 text-white" data-testid="input-rzp-id" />
              </Field>
              <Field label="Razorpay Key Secret" current={keys.razorpay_key_secret_masked || "(not set)"} testid="key-rzp-secret">
                <Input type="password" value={keysForm.razorpay_key_secret} onChange={(e) => setKeysForm({...keysForm, razorpay_key_secret: e.target.value})} placeholder="••••••••" className="bg-black/40 border-white/10 text-white" data-testid="input-rzp-secret" />
              </Field>
              <Field label="Google Client ID (display)" current={keys.google_client_id || "(not set)"} testid="key-google">
                <Input value={keysForm.google_client_id} onChange={(e) => setKeysForm({...keysForm, google_client_id: e.target.value})} placeholder="xxx.apps.googleusercontent.com" className="bg-black/40 border-white/10 text-white" data-testid="input-google-id" />
              </Field>
            </div>
            <Button onClick={saveKeys} data-testid="save-keys-btn" className="btn-gradient rounded-full mt-6">Save keys</Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!adjUser} onOpenChange={(v) => { if (!v) setAdjUser(null); }}>
        <DialogContent className="bg-[#0a0a0c] border-white/10 text-white">
          <DialogHeader><DialogTitle>Adjust credits — {adjUser?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-secondary text-sm">Current: <span className="font-mono">{adjUser?.credits}</span>. Use negative numbers to subtract.</p>
            <div className="flex gap-2">
              <Button onClick={() => setDelta(Number(delta) - 10)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white"><Minus size={14}/>10</Button>
              <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} data-testid="delta-input" className="bg-black/40 border-white/10 text-white" />
              <Button onClick={() => setDelta(Number(delta) + 10)} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white"><Plus size={14}/>10</Button>
            </div>
            <Button onClick={adjustCredits} data-testid="confirm-adjust" className="btn-gradient w-full rounded-full">Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Field({ label, current, children, testid }) {
  return (
    <div data-testid={testid}>
      <p className="text-xs uppercase tracking-widest text-muted mb-2">{label}</p>
      <p className="text-xs font-mono text-secondary mb-2">Current: {current}</p>
      {children}
    </div>
  );
}

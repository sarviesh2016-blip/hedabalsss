import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState({ plans: [], configured: false });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [p, h] = await Promise.all([
          api.get("/payments/plans"),
          api.get("/payments/history"),
        ]);
        setData(p.data);
        setHistory(h.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const purchase = async (planId) => {
    setBuying(planId);
    try {
      const { data: orderData } = await api.post("/payments/create-order", { plan_or_pack: planId });
      const { order, razorpay_key_id, mock } = orderData;

      if (mock || !razorpay_key_id) {
        // Placeholder mode — simulate verification
        toast.message("Test mode: simulating payment…");
        await api.post("/payments/verify", {
          razorpay_order_id: order.id,
          razorpay_payment_id: `pay_test_${Date.now()}`,
          razorpay_signature: "test_signature",
        });
        toast.success("Credits added (test mode)");
        await refresh();
        const h = await api.get("/payments/history");
        setHistory(h.data);
        setBuying("");
        return;
      }

      // Real Razorpay flow
      const openCheckout = () => {
        const rzp = new window.Razorpay({
          key: razorpay_key_id,
          amount: order.amount,
          currency: "INR",
          name: "VideosToPrompt.com",
          description: planId,
          order_id: order.id,
          theme: { color: "#8B5CF6" },
          handler: async (resp) => {
            try {
              await api.post("/payments/verify", {
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              });
              toast.success("Payment verified — credits added");
              await refresh();
              const h = await api.get("/payments/history");
              setHistory(h.data);
            } catch { toast.error("Verification failed"); }
          },
        });
        rzp.open();
      };

      if (window.Razorpay) {
        openCheckout();
      } else {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = openCheckout;
        document.body.appendChild(s);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Payment failed");
    } finally {
      setBuying("");
    }
  };

  if (loading) return <DashboardLayout><div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}</div></DashboardLayout>;

  const subs = data.plans.filter(p => p.type === "subscription");
  const packs = data.plans.filter(p => p.type === "credits");

  return (
    <DashboardLayout>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted">Billing</p>
        <h1 className="text-3xl sm:text-4xl font-heading font-semibold mt-1">Plans & Credits</h1>
      </div>

      <div className="glass rounded-2xl p-6 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Current plan</p>
          <p className="text-2xl font-heading font-semibold mt-1 capitalize">{user?.plan}</p>
          <p className="text-secondary text-sm mt-1">{user?.credits} credits available</p>
        </div>
        {!data.configured && (
          <div className="flex items-center gap-2 text-amber-300 text-xs bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded-full">
            <AlertCircle size={14} /> Razorpay in test mode — payments simulated
          </div>
        )}
      </div>

      <h2 className="text-lg font-heading mb-4">Subscriptions</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {subs.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-6" data-testid={`buy-card-${p.id}`}>
            <p className="text-xs uppercase tracking-widest text-muted">{p.name}</p>
            <p className="text-3xl font-heading font-semibold mt-2">₹{(p.amount / 100).toLocaleString()}</p>
            <p className="text-xs text-muted">{p.credits} credits / month</p>
            <Button
              data-testid={`buy-btn-${p.id}`}
              disabled={buying === p.id || user?.plan === p.id}
              onClick={() => purchase(p.id)}
              className="btn-gradient w-full mt-5 rounded-full h-10 disabled:opacity-50"
            >
              {buying === p.id ? "Processing…" : user?.plan === p.id ? "Current plan" : <><Sparkles size={14} className="mr-1" /> Subscribe</>}
            </Button>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-heading mb-4">Credit packs</h2>
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        {packs.map((p) => (
          <div key={p.id} className="glass rounded-2xl p-6" data-testid={`buy-card-${p.id}`}>
            <p className="text-xs uppercase tracking-widest text-muted">{p.name}</p>
            <p className="text-3xl font-heading font-semibold mt-2">₹{(p.amount / 100).toLocaleString()}</p>
            <p className="text-xs text-muted">One-time</p>
            <Button
              data-testid={`buy-btn-${p.id}`}
              disabled={buying === p.id}
              onClick={() => purchase(p.id)}
              className="w-full mt-5 rounded-full h-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white disabled:opacity-50"
            >
              {buying === p.id ? "Processing…" : "Buy pack"}
            </Button>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-heading mb-4">Payment history</h2>
      <div className="glass rounded-2xl overflow-hidden" data-testid="payment-history">
        {history.length === 0 ? (
          <div className="p-10 text-center text-secondary text-sm">No payments yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {history.map(p => (
              <div key={p.payment_id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm capitalize">{p.plan_or_pack}</p>
                  <p className="text-xs text-muted">{new Date(p.created_at).toLocaleString()} · {p.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">₹{(p.amount / 100).toLocaleString()}</p>
                  <span className={`text-[10px] uppercase tracking-wider ${p.status === "paid" ? "text-emerald-400" : p.status === "failed" ? "text-rose-400" : "text-amber-300"}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

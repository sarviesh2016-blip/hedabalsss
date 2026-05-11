import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

export default function MasterLogin() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/admin-master/login", { username, password });
      if (data.session_token) localStorage.setItem("session_token", data.session_token);
      setUser(data.user);
      toast.success("Signed in as Master Admin");
      // Hard redirect — guarantees AuthContext re-initialises with the new session
      // before ProtectedRoute runs (avoids the setUser/navigate race).
      window.location.replace("/admin");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-5 bg-zinc-50">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.08), transparent)" }} />
      <button onClick={() => navigate("/")} data-testid="back-home-btn" className="absolute top-6 left-6 text-secondary hover:text-zinc-900 flex items-center gap-2 text-sm">
        <ArrowLeft size={16} /> Back home
      </button>

      <div className="relative w-full max-w-md">
        <form onSubmit={submit} className="glass-strong rounded-3xl p-8" data-testid="master-login-form">
          <div className="flex justify-center mb-6">
            <Logo className="h-9" to={null} />
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck size={18} className="text-violet-700" />
            <h1 className="text-2xl font-heading font-semibold">Master Admin</h1>
          </div>
          <p className="text-secondary text-sm text-center">
            Restricted access · username &amp; password
          </p>

          <div className="mt-7 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Username</p>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="admin"
                data-testid="master-username"
                className="bg-white border-zinc-200"
                required
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted mb-2">Password</p>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                data-testid="master-password"
                className="bg-white border-zinc-200"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              data-testid="master-submit"
              className="btn-gradient w-full rounded-full h-11"
            >
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted flex items-center justify-center gap-1.5">
              <Lock size={11} /> 5 failed attempts → 15-min lockout
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200 text-center">
            <button
              type="button"
              onClick={() => navigate("/login")}
              data-testid="back-to-google-login"
              className="text-xs text-secondary hover:text-zinc-900 underline underline-offset-4"
            >
              ← Regular sign in with Google
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

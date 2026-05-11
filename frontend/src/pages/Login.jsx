import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const navigate = useNavigate();
  const { user, loading, setUser } = useAuth();
  const [ownClientId, setOwnClientId] = useState(null);   // null = loading, "" = not configured, "xxx" = configured
  const gisDiv = useRef(null);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/site-config");
        setOwnClientId(data?.google_client_id || "");
      } catch {
        setOwnClientId("");
      }
    })();
  }, []);

  // Initialize Google Identity Services when client_id is available
  useEffect(() => {
    if (!ownClientId) return;
    const init = () => {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      if (!window.google?.accounts?.id || !gisDiv.current) return;
      window.google.accounts.id.initialize({
        client_id: ownClientId,
        callback: async (resp) => {
          try {
            const { data } = await api.post("/auth/google-own/verify", { credential: resp.credential });
            if (data.session_token) localStorage.setItem("session_token", data.session_token);
            setUser(data.user);
            toast.success("Signed in");
            // Hard redirect avoids the setUser/navigate race
            window.location.replace(data.user?.role === "admin" ? "/admin" : "/dashboard");
          } catch (e) {
            console.error(e);
            toast.error(e?.response?.data?.detail || "Google sign-in failed");
          }
        },
      });
      window.google.accounts.id.renderButton(gisDiv.current, {
        type: "standard", theme: "outline", size: "large",
        text: "continue_with", shape: "pill", width: 340,
      });
    };
    if (window.google?.accounts?.id) { init(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true; s.onload = init;
    document.body.appendChild(s);
  }, [ownClientId, navigate, setUser]);

  const handleBootstrapLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-5 bg-zinc-50">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.08), transparent)" }} />
      <button onClick={() => navigate("/")} data-testid="back-home-btn" className="absolute top-6 left-6 text-secondary hover:text-zinc-900 flex items-center gap-2 text-sm">
        <ArrowLeft size={16} /> Back home
      </button>

      <div className="relative w-full max-w-md">
        <div className="glass-strong rounded-3xl p-8">
          <div className="flex justify-center mb-6">
            <Logo className="h-9" to={null} />
          </div>
          <h1 className="text-3xl font-heading font-semibold text-center">Welcome</h1>
          <p className="text-secondary text-sm text-center mt-2">
            Sign in to turn your videos into cinematic AI prompts.
          </p>

          {ownClientId === null && (
            <div className="mt-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          )}

          {ownClientId && (
            <div className="mt-8 flex flex-col items-center gap-2" data-testid="google-own-section">
              <div ref={gisDiv} data-testid="google-own-btn-container" />
              <p className="text-[10px] uppercase tracking-widest text-muted mt-2">Sign in with Google</p>
            </div>
          )}

          {ownClientId === "" && (
            <div className="mt-8 space-y-4" data-testid="google-not-configured">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="flex items-center gap-2 text-amber-900 font-medium">
                  <AlertCircle size={16} /> Google sign-in not configured yet
                </p>
                <p className="text-amber-800 text-xs mt-1.5 leading-relaxed">
                  The site admin needs to paste a Google OAuth Client ID in
                  <span className="font-mono"> Admin → Integrations</span>.
                </p>
              </div>
              <button
                onClick={handleBootstrapLogin}
                data-testid="admin-bootstrap-btn"
                className="w-full text-center text-xs text-secondary hover:text-zinc-900 underline underline-offset-4"
              >
                First-time admin? Click here to bootstrap login →
              </button>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-muted flex items-center justify-center gap-1.5">
              <Lock size={11} /> Secure OAuth · no passwords stored
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-200 text-center">
            <p className="text-xs text-muted">By continuing you agree to our Terms &amp; Privacy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const navigate = useNavigate();
  const { user, loading, refresh, setUser } = useAuth();
  const [ownClientId, setOwnClientId] = useState("");
  const gisDiv = useRef(null);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  // Fetch public site-config to know if a own Google Client ID is configured
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/site-config");
        if (data?.google_client_id) setOwnClientId(data.google_client_id);
      } catch {}
    })();
  }, []);

  // Initialize Google Identity Services if a client_id is available
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
            navigate("/dashboard", { state: { user: data.user }, replace: true });
          } catch (e) {
            console.error(e);
            toast.error(e?.response?.data?.detail || "Google sign-in failed");
          }
        },
      });
      window.google.accounts.id.renderButton(gisDiv.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320,
      });
    };

    if (window.google?.accounts?.id) { init(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = init;
    document.body.appendChild(s);
  }, [ownClientId, navigate, refresh, setUser]);

  const handleEmergentGoogleLogin = () => {
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

          {/* Own Google OAuth (admin-configured) */}
          {ownClientId ? (
            <div className="mt-7 flex flex-col items-center gap-3" data-testid="google-own-section">
              <p className="text-[10px] uppercase tracking-widest text-muted">Sign in with Google</p>
              <div ref={gisDiv} data-testid="google-own-btn-container" />
            </div>
          ) : null}

          {/* Divider when both are present */}
          {ownClientId ? (
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-zinc-200" />
              <span className="text-[10px] uppercase tracking-widest text-muted">or</span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>
          ) : <div className="mt-7" />}

          {/* Emergent-managed Google (default, always available) */}
          <Button
            data-testid="google-login-btn"
            onClick={handleEmergentGoogleLogin}
            className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full font-medium flex items-center justify-center gap-3"
          >
            <Sparkles size={16} /> Continue with Emergent Auth
          </Button>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted flex items-center justify-center gap-1.5">
              <Lock size={11} /> Secure OAuth · no password stored
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200 text-center">
            <p className="text-xs text-muted">By continuing you agree to our Terms &amp; Privacy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [loading, user, navigate]);

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-5">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(99,102,241,0.18), transparent)" }} />
      <button onClick={() => navigate("/")} data-testid="back-home-btn" className="absolute top-6 left-6 text-secondary hover:text-white flex items-center gap-2 text-sm">
        <ArrowLeft size={16} /> Back home
      </button>

      <div className="relative w-full max-w-md">
        <div className="glass-strong rounded-3xl p-8 ring-cyan-glow">
          <div className="flex justify-center mb-6">
            <Logo className="h-10" to={null} />
          </div>
          <h1 className="text-3xl font-heading font-semibold text-center">Welcome</h1>
          <p className="text-secondary text-sm text-center mt-2">
            Sign in to turn your videos into cinematic AI prompts.
          </p>

          <Button
            data-testid="google-login-btn"
            onClick={handleGoogleLogin}
            className="w-full mt-8 h-12 bg-white text-black hover:bg-white/90 rounded-full font-medium flex items-center justify-center gap-3"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
            Continue with Google
          </Button>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted flex items-center justify-center gap-1.5">
              <Lock size={11} /> Secured by Emergent Auth
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-muted">By continuing you agree to our Terms & Privacy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

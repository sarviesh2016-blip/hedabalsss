import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/login");
      return;
    }
    const sessionId = decodeURIComponent(m[1]);

    (async () => {
      try {
        const { data } = await api.post("/auth/session", null, {
          headers: { "X-Session-ID": sessionId },
        });
        if (data.session_token) localStorage.setItem("session_token", data.session_token);
        setUser(data.user);
        // Clean URL and hard-redirect — avoids the setUser/navigate race
        const target = data.user?.role === "admin" ? "/admin" : "/dashboard";
        window.history.replaceState(null, "", target);
        window.location.replace(target);
      } catch (e) {
        console.error(e);
        toast.error("Sign-in failed. Please try again.");
        navigate("/login");
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-zinc-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-secondary">Completing sign-in…</p>
      </div>
    </div>
  );
}

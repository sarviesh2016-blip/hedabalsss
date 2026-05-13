import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/pricing", label: "Pricing" },
  { to: "/api-docs", label: "API" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

export default function MarketingLayout({ children }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, loading } = useAuth();

  const initial = (user?.name || user?.email || "?").trim()[0]?.toUpperCase() || "?";
  const goDash = () => navigate(user?.role === "admin" ? "/admin" : "/dashboard");

  return (
    <div className="min-h-screen relative">
      <div className="grain" />
      <header className="fixed top-0 inset-x-0 z-50 glass-strong border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Logo className="h-8" />
          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                data-testid={`nav-${n.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `text-sm tracking-wide transition-colors ${isActive ? "text-zinc-900" : "text-secondary hover:text-zinc-900"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {!loading && user ? (
              <button
                onClick={goDash}
                data-testid="header-user-chip"
                className="flex items-center gap-2.5 rounded-full pl-1 pr-4 py-1 border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors group"
                title="Go to dashboard"
              >
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-brand-gradient-soft border border-zinc-200 text-violet-700 font-medium text-sm flex items-center justify-center">
                    {initial}
                  </span>
                )}
                <span className="text-sm text-zinc-900 max-w-[140px] truncate" data-testid="header-user-name">
                  {user.name || user.email}
                </span>
                <LayoutDashboard size={14} className="text-secondary group-hover:text-violet-700 transition-colors" />
              </button>
            ) : !loading ? (
              <>
                <Button variant="ghost" data-testid="header-login-btn" onClick={() => navigate("/login")} className="text-secondary hover:text-zinc-900 hover:bg-zinc-100">
                  Sign in
                </Button>
                <Button data-testid="header-cta-btn" onClick={() => navigate("/login")} className="btn-gradient rounded-full px-5">
                  Start free
                </Button>
              </>
            ) : null}
          </div>
          <button data-testid="mobile-menu-btn" className="md:hidden text-zinc-900" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-zinc-200 bg-white/95 backdrop-blur-xl">            <div className="px-5 py-4 flex flex-col gap-3">
              {navItems.map((n) => (
                <Link key={n.to} to={n.to} className="text-sm text-secondary hover:text-zinc-900" onClick={() => setOpen(false)}>
                  {n.label}
                </Link>
              ))}
              {!loading && user ? (
                <Button data-testid="mobile-dash-btn" className="btn-gradient rounded-full" onClick={() => { setOpen(false); goDash(); }}>
                  Go to dashboard
                </Button>
              ) : (
                <Button data-testid="mobile-cta" className="btn-gradient rounded-full" onClick={() => { setOpen(false); navigate("/login"); }}>
                  Start free
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="pt-16">{children}</main>

      <footer className="border-t border-zinc-200 mt-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <Logo className="h-8" />
            <p className="text-secondary text-sm mt-4 max-w-xs">
              Turn any video into powerful AI prompts for the next generation of creators.
            </p>
          </div>
          <div>
            <p className="text-zinc-900 text-sm font-medium mb-4">Product</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li><Link to="/pricing" className="hover:text-zinc-900">Pricing</Link></li>
              <li><Link to="/api-docs" className="hover:text-zinc-900">API</Link></li>
              <li><Link to="/blog" className="hover:text-zinc-900">Blog</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-zinc-900 text-sm font-medium mb-4">Company</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li><Link to="/contact" className="hover:text-zinc-900">Contact</Link></li>
              <li><Link to="/blog" className="hover:text-zinc-900">Stories</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-zinc-900 text-sm font-medium mb-4">Legal</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li><Link to="/privacy" data-testid="footer-privacy" className="hover:text-zinc-900">Privacy Policy</Link></li>
              <li><Link to="/terms" data-testid="footer-terms" className="hover:text-zinc-900">Terms &amp; Conditions</Link></li>
              <li><Link to="/refund" data-testid="footer-refund" className="hover:text-zinc-900">Refund Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-zinc-200">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 text-xs text-muted flex items-center justify-between">
            <span>© {new Date().getFullYear()} VideosToPrompt.com</span>
            <span>Made for creators · India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

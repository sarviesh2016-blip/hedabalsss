import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navItems = [
  { to: "/pricing", label: "Pricing" },
  { to: "/api-docs", label: "API" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

export default function MarketingLayout({ children }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen relative">
      <div className="grain" />
      <header className="fixed top-0 inset-x-0 z-50 glass-strong">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
          <Logo className="h-8" />
          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={`nav-${n.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `text-sm tracking-wide transition-colors ${isActive ? "text-white" : "text-secondary hover:text-white"}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" data-testid="header-login-btn" onClick={() => navigate("/login")} className="text-secondary hover:text-white hover:bg-white/5">
              Sign in
            </Button>
            <Button data-testid="header-cta-btn" onClick={() => navigate("/login")} className="btn-gradient rounded-full px-5">
              Start free
            </Button>
          </div>
          <button data-testid="mobile-menu-btn" className="md:hidden text-white" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-white/5 bg-black/80 backdrop-blur-xl">
            <div className="px-5 py-4 flex flex-col gap-3">
              {navItems.map((n) => (
                <Link key={n.to} to={n.to} className="text-sm text-secondary hover:text-white" onClick={() => setOpen(false)}>
                  {n.label}
                </Link>
              ))}
              <Button data-testid="mobile-cta" className="btn-gradient rounded-full" onClick={() => { setOpen(false); navigate("/login"); }}>
                Start free
              </Button>
            </div>
          </div>
        )}
      </header>

      <main className="pt-16">{children}</main>

      <footer className="border-t border-white/5 mt-24">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-14 grid md:grid-cols-4 gap-10">
          <div>
            <Logo className="h-8" />
            <p className="text-secondary text-sm mt-4 max-w-xs">
              Turn any video into powerful AI prompts for the next generation of creators.
            </p>
          </div>
          <div>
            <p className="text-white text-sm font-medium mb-4">Product</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link to="/api-docs" className="hover:text-white">API</Link></li>
              <li><Link to="/blog" className="hover:text-white">Blog</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-white text-sm font-medium mb-4">Company</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link to="/blog" className="hover:text-white">Stories</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-white text-sm font-medium mb-4">AI Models</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li>Veo · Sora · Kling</li>
              <li>Runway · Midjourney · Flux</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5 text-xs text-muted flex items-center justify-between">
            <span>© {new Date().getFullYear()} VideosToPrompt.com</span>
            <span>Made for creators · India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

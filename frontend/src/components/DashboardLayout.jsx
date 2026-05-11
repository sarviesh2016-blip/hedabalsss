import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Upload, Bookmark, CreditCard, Code2,
  Shield, LogOut, Sparkles, Menu, Home as HomeIcon
} from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: HomeIcon, testid: "side-home", external: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "side-dashboard" },
  { to: "/upload", label: "New Generation", icon: Upload, testid: "side-upload" },
  { to: "/saved-prompts", label: "Saved Prompts", icon: Bookmark, testid: "side-saved" },
  { to: "/billing", label: "Billing", icon: CreditCard, testid: "side-billing" },
  { to: "/api-docs", label: "API Keys", icon: Code2, testid: "side-api" },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const sidebarBody = (
    <>
      <div className="p-5">
        <Logo className="h-7" to="/dashboard" />
      </div>
      <div className="px-4">
        <div className="glass rounded-xl p-4 mb-5" data-testid="credit-balance-card">
          <p className="text-[10px] uppercase tracking-widest text-muted">Credits</p>
          <p className="text-3xl font-heading font-semibold mt-1 gradient-text">{user?.credits ?? 0}</p>
          <p className="text-xs text-secondary mt-1 capitalize">{user?.plan} plan</p>
          <Button onClick={() => { setOpen(false); navigate("/billing"); }} data-testid="sidebar-upgrade-btn" className="btn-gradient rounded-full w-full mt-3 h-9 text-xs">
            <Sparkles size={14} className="mr-1" /> Upgrade
          </Button>
        </div>
      </div>
      <nav className="px-3 flex-1">
        {navItems.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            onClick={() => setOpen(false)}
            data-testid={n.testid}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-1 ${
                isActive && !n.external
                  ? "bg-zinc-100 text-zinc-900 border border-zinc-200"
                  : "text-secondary hover:text-zinc-900 hover:bg-zinc-100"
              }`
            }
          >
            <n.icon size={16} />
            {n.label}
          </NavLink>
        ))}
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            onClick={() => setOpen(false)}
            data-testid="side-admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all mb-1 ${
                isActive
                  ? "bg-zinc-100 text-cyan-700 border border-cyan-300"
                  : "text-secondary hover:text-zinc-900 hover:bg-zinc-100"
              }`
            }
          >
            <Shield size={16} />
            Admin
          </NavLink>
        )}
      </nav>
      <div className="p-4 border-t border-zinc-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-gradient flex items-center justify-center text-xs font-semibold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{user?.name}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
          <button data-testid="logout-btn" onClick={async () => { await logout(); navigate("/"); }} className="text-secondary hover:text-zinc-900">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-zinc-200 fixed inset-y-0 left-0 z-40">
        {sidebarBody}
      </aside>

      {/* Sidebar - mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-zinc-200 flex flex-col">
            {sidebarBody}
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64">
        <header className="lg:hidden glass-strong sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-zinc-200">
          <button data-testid="dashboard-menu-btn" onClick={() => setOpen(true)} className="text-zinc-900">
            <Menu size={20} />
          </button>
          <Logo className="h-6" to="/dashboard" />
          <div className="w-8 h-8 rounded-full bg-brand-gradient" />
        </header>
        <main className="px-5 lg:px-10 py-8 max-w-[1400px]">{children}</main>
      </div>
    </div>
  );
}

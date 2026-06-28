"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/utils";
import {
  LayoutDashboard,
  Upload,
  FolderOpen,
  LogOut,
  Film,
  User,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import toast from "react-hot-toast";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "New Project", icon: Upload },
  { href: "/dashboard/projects", label: "Projects", icon: FolderOpen },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-obsidian-100 border-r border-slate-800 fixed left-0 top-0 bottom-0 z-30">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Film className="w-5 h-5 text-obsidian-300" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">
                Estate<span className="text-amber-500">Clips</span>
              </span>
              <p className="text-xs text-slate-500 -mt-0.5">Real Estate Video AI</p>
            </div>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
                  active
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <Link
            href="/dashboard/profile"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
              pathname === "/dashboard/profile"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
          >
            <User className="w-4 h-4" />
            Agent Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-obsidian-300/95 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
              <Film className="w-4 h-4 text-obsidian-300" />
            </div>
            <span className="text-base font-bold text-white">
              Estate<span className="text-amber-500">Clips</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="border-t border-slate-800 bg-obsidian-300 px-4 py-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                    active
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </header>
    </>
  );
}

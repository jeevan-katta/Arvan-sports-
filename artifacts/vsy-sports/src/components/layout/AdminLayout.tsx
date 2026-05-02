import { useState, useRef, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, Building2, Wallet, ShoppingBag,
  LogOut, ChevronDown, Home, Check, Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin",        icon: LayoutDashboard, exact: true },
  { name: "Owners",    href: "/admin/owners", icon: Building2 },
  { name: "Users",     href: "/admin/users",  icon: Users },
  { name: "Payout",    href: "/admin/payout", icon: Wallet },
  { name: "Shop",      href: "/admin/shop",   icon: ShoppingBag },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeItem =
    NAV_ITEMS.find(n =>
      n.exact ? location === n.href : location === n.href || location.startsWith(n.href + "/")
    ) ?? NAV_ITEMS[0];

  // Close dropdown whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [location]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0f18] text-white flex flex-col">

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 bg-[#0d0f18]/95 backdrop-blur-md border-b border-white/[0.07]">
        <div className="flex items-center justify-between h-14 px-4 md:px-6 gap-4">

          {/* Logo */}
          <Link href="/admin">
            <div className="flex items-center gap-2.5 cursor-pointer group">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40 group-hover:shadow-primary/60 transition-all">
                <Zap className="h-4 w-4 text-white fill-white" />
              </div>
              <div className="hidden sm:block">
                <p className="font-black text-sm tracking-widest text-white leading-none">VSY SPORTS</p>
                <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest leading-none mt-0.5">Admin Console</p>
              </div>
            </div>
          </Link>

          {/* Section Dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(v => !v)}
              className={cn(
                "flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-xl border font-bold text-sm transition-all",
                open
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/30"
                  : "bg-white/[0.06] border-white/[0.10] text-white hover:bg-white/10 hover:border-white/20"
              )}
            >
              <activeItem.icon className="h-4 w-4 flex-shrink-0" />
              <span>{activeItem.name}</span>
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-white/60", open && "rotate-180")} />
            </button>

            {open && (
              <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] w-52 bg-[#161924] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                <div className="p-1.5 space-y-0.5">
                  {NAV_ITEMS.map(item => {
                    const isActive = item.exact
                      ? location === item.href
                      : location === item.href || location.startsWith(item.href + "/");
                    return (
                      <Link key={item.name} href={item.href}>
                        <div className={cn(
                          "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none",
                          isActive
                            ? "bg-primary text-white"
                            : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                        )}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1">{item.name}</span>
                          {isActive && <Check className="h-3.5 w-3.5 opacity-80" />}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="border-t border-white/[0.06] p-1.5">
                  <Link href="/">
                    <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-semibold text-white/40 hover:bg-white/[0.06] hover:text-white transition-all cursor-pointer">
                      <Home className="h-4 w-4" /> View App
                    </div>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:flex items-center gap-2 bg-white/[0.05] rounded-xl px-3 py-1.5">
                <div className="h-6 w-6 rounded-lg bg-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                  {user.name?.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-white/60">{user.name}</span>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>

        {/* Active section indicator bar */}
        <div className="h-0.5 bg-white/[0.04]">
          <div className="h-full bg-primary/60 w-full" />
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 bg-[#111420] overflow-auto">
        {children}
      </main>
    </div>
  );
}

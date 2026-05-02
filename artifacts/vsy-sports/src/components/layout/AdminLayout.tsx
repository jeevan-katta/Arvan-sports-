import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Users, MapPin, Calendar, ShoppingBag,
  LogOut, Building2, BookOpen, ChevronRight, Home,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
  { name: "Owners", href: "/admin/owners", icon: Building2 },
  { name: "Bookings", href: "/admin/bookings", icon: BookOpen },
  { name: "Turfs", href: "/admin/turfs", icon: MapPin },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Events", href: "/admin/events", icon: Calendar },
  { name: "Shop", href: "/admin/shop", icon: ShoppingBag },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col md:flex-row">
      {/* ── Mobile Top Bar ── */}
      <header className="md:hidden sticky top-0 z-40 bg-[#0f1117] border-b border-white/10 h-14 flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-[10px] font-black text-primary-foreground">V</span>
          </div>
          <span className="font-black text-sm tracking-wider text-white">ADMIN</span>
        </div>
        <div className="flex gap-1.5 text-xs overflow-x-auto hide-scrollbar pb-0.5">
          {navItems.map(item => (
            <Link key={item.name} href={item.href}>
              <span className={cn(
                "whitespace-nowrap px-3 py-1.5 rounded-full font-bold transition-all inline-block",
                isActive(item.href, item.exact)
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              )}>
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </header>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 flex-col bg-[#0f1117] border-r border-white/10 h-screen sticky top-0 flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-sm font-black text-primary-foreground">V</span>
            </div>
            <div>
              <p className="font-black text-base tracking-wider text-white leading-none">VSY SPORTS</p>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = isActive(item.href, item.exact);
            return (
              <Link key={item.name} href={item.href}>
                <span className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold transition-all w-full text-sm cursor-pointer group",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                )}>
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link href="/">
            <span className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-white/40 hover:bg-white/5 hover:text-white transition-all text-sm cursor-pointer">
              <Home className="h-4 w-4" /> View App
            </span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3.5 py-2.5 w-full rounded-xl font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 bg-[#13161e] min-h-[calc(100vh-3.5rem)] md:min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  );
}

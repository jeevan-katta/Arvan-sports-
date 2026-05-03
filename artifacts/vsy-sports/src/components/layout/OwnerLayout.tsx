import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Building2, CalendarDays, TrendingUp, Wallet, LogOut, Trophy,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/owner/NotificationBell";

const navItems = [
  { name: "Dashboard", href: "/owner",          icon: LayoutDashboard, exact: true },
  { name: "My Turfs",  href: "/owner/turfs",    icon: Building2 },
  { name: "Bookings",  href: "/owner/bookings", icon: CalendarDays },
  { name: "Events",    href: "/owner/events",   icon: Trophy },
  { name: "Revenue",   href: "/owner/revenue",  icon: TrendingUp },
  { name: "Payout",    href: "/owner/payout",   icon: Wallet },
];

export function OwnerLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? location === href : location === href || location.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-muted/30 flex justify-center">
      <div className="w-full max-w-md bg-background min-h-screen flex flex-col shadow-2xl">

        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-card border-b border-border">
          <div className="h-12 flex items-center justify-between px-4 gap-3">
            <h1 className="font-display font-bold text-base text-primary flex-shrink-0">
              OWNER PORTAL
            </h1>

            <div className="flex items-center gap-1 flex-shrink-0">
              <NotificationBell />
              <button
                onClick={() => { logout(); setLocation("/login"); }}
                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors h-8 w-8 justify-center rounded-full hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Nav pills */}
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto hide-scrollbar">
            {navItems.map((item) => {
              const active = isActive(item.href, item.exact);
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    <item.icon className="h-3 w-3 flex-shrink-0" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

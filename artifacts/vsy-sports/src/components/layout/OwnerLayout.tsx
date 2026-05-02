import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Building2, CalendarDays, TrendingUp, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { name: "Dashboard", href: "/owner", icon: LayoutDashboard },
  { name: "My Turfs", href: "/owner/turfs", icon: Building2 },
  { name: "Bookings", href: "/owner/bookings", icon: CalendarDays },
  { name: "Revenue", href: "/owner/revenue", icon: TrendingUp },
];

export function OwnerLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-muted/30 flex justify-center">
      <div className="w-full max-w-md bg-background min-h-screen flex flex-col shadow-2xl">
        {/* Mobile top nav */}
        <header className="sticky top-0 z-40 bg-card border-b border-border h-14 flex items-center justify-between px-4">
          <h1 className="font-display font-bold text-lg text-primary">OWNER PORTAL</h1>
          <div className="flex gap-2 text-xs overflow-x-auto hide-scrollbar">
            {navItems.map(item => (
              <Link
                key={item.name}
                href={item.href}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full font-bold transition-colors ${location === item.href ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => { logout(); setLocation("/login"); }}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-destructive font-bold py-2"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

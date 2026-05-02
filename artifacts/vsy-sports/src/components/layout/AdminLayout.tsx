import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, MapPin, Calendar, ShoppingBag, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "Turfs", href: "/admin/turfs", icon: MapPin },
    { name: "Events", href: "/admin/events", icon: Calendar },
    { name: "Shop", href: "/admin/shop", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Nav Header */}
      <header className="md:hidden sticky top-0 z-40 bg-card border-b border-border h-14 flex items-center justify-between px-4">
        <h1 className="font-display font-bold text-lg text-primary">VSY ADMIN</h1>
        <div className="flex gap-3 text-xs overflow-x-auto hide-scrollbar">
          {navItems.map(item => (
            <Link key={item.name} href={item.href} className={`whitespace-nowrap px-3 py-1.5 rounded-full font-bold transition-colors ${location === item.href ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {item.name}
            </Link>
          ))}
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-card border-r border-border h-screen sticky top-0">
        <div className="p-6 border-b border-border">
          <h1 className="font-display font-bold text-2xl text-primary tracking-wider">VSY ADMIN</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map(item => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <item.icon className="h-5 w-5" />
                  {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-bold text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-muted/10 min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        {children}
      </main>
    </div>
  );
}
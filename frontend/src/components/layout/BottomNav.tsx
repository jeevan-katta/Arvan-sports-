import { Link, useLocation } from "wouter";
import { Home, MapPin, Users, Calendar, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGetCart } from "@workspace/api-client-react";

export function BottomNav() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Only fetch cart if authenticated
  const { data: cart } = useGetCart({
    query: {
      enabled: isAuthenticated
    }
  });

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Venues", href: "/turfs", icon: MapPin },
    { name: "Community", href: "/community", icon: Users },
    { name: "Events", href: "/events", icon: Calendar },
    { name: "Shop", href: "/shop", icon: ShoppingBag },
    { name: "Profile", href: "/profile", icon: User },
  ];

  // Don't show bottom nav on admin routes
  if (location.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="grid grid-cols-6 items-end h-18 w-full max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-10 pt-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} className={`flex flex-col items-center justify-end min-w-0 h-full pb-1.5 space-y-1 ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <div className="relative flex items-center justify-center">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { Link, useLocation } from "wouter";
import { Home, MapPin, Users, Calendar, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useGetCart } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

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
    { name: "Shop", href: "/shop", icon: ShoppingBag, badge: cart?.itemCount },
    { name: "Profile", href: "/profile", icon: User },
  ];

  // Don't show bottom nav on admin routes
  if (location.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto w-full px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.badge && item.badge > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

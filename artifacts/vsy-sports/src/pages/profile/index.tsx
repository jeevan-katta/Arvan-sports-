import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { MapPin, LogOut, Settings, Bell, Calendar, ShoppingBag, ChevronRight, User as UserIcon } from "lucide-react";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  useEffect(() => {
    if (!user) setLocation("/login");
  }, [user, setLocation]);

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-full bg-muted/10 pb-20">
      <Header title="Profile" showLocation={false} />
      
      <div className="bg-background pt-6 pb-8 px-4 border-b border-border shadow-sm text-center">
        <Avatar className="h-24 w-24 mx-auto border-4 border-background shadow-lg mb-4 ring-2 ring-primary/20">
          <AvatarImage src={user.avatar} />
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
            {user.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-bold font-display tracking-wide">{user.name}</h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        
        <div className="mt-4 inline-flex items-center text-xs font-bold uppercase tracking-wider bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          {user.role.replace('_', ' ')}
        </div>
      </div>

      <main className="p-4 space-y-6 mt-2">
        
        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/bookings" className="block">
              <Card className="p-4 border-none shadow-sm hover:border-primary/50 transition-colors flex flex-col items-center text-center">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-2 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm">My Bookings</span>
              </Card>
          </Link>
          <Link href="/orders" className="block">
              <Card className="p-4 border-none shadow-sm hover:border-primary/50 transition-colors flex flex-col items-center text-center">
                <div className="h-10 w-10 bg-secondary/10 rounded-full flex items-center justify-center mb-2 text-secondary">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm">My Orders</span>
              </Card>
          </Link>
        </div>

        {/* Settings List */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-sm">Edit Profile</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-sm">Saved Addresses</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-sm">Notifications</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-sm">Settings</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {user.role === 'turf_owner' && (
          <Link href="/owner" className="block w-full">
              <Button variant="secondary" className="w-full h-12 rounded-xl font-bold">
                Owner Portal
              </Button>
          </Link>
        )}

        {user.role === 'admin' && (
          <Link href="/admin" className="block w-full">
              <Button variant="secondary" className="w-full h-12 rounded-xl font-bold">
                Admin Dashboard
              </Button>
          </Link>
        )}

        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 font-bold"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" /> Log Out
        </Button>

      </main>
    </div>
  );
}
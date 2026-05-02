import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useListBookings } from "@workspace/api-client-react";
import { useLiveScores, ballColor } from "@/hooks/use-live-scores";
import { MapPin, LogOut, Bell, Calendar, ShoppingBag, ChevronRight, Radio, Pencil, Check, X, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, token, login, logout } = useAuth();
  const { toast } = useToast();
  const { matches } = useLiveScores();
  const { data: bookings } = useListBookings();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) setLocation("/login");
    else {
      setEditName(user.name || "");
      setEditPhone((user as any).phone || "");
    }
  }, [user, setLocation]);

  if (!user) return null;

  const myMatch = matches.find(m => m.createdBy === user.id && m.status === "live");

  const confirmedBookings = bookings?.filter(b => b.status === "confirmed") || [];
  const totalSpent = bookings?.filter(b => b.status === "confirmed").reduce((sum, b) => sum + ((b as any).totalAmount || 0), 0) || 0;

  const handleSaveProfile = async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      toast({ variant: "destructive", title: "Name must be at least 2 characters" }); return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim(), phone: editPhone.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updatedUser = await res.json();
      login(token!, updatedUser);
      toast({ title: "Profile updated!" });
      setIsEditing(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to save", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="flex flex-col min-h-full bg-muted/10 pb-24">
      <Header title="Profile" showLocation={false} />

      {/* Profile Header */}
      <div className="bg-background pt-6 pb-6 px-4 border-b border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg ring-2 ring-primary/20">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="h-9 text-sm font-bold"
                  placeholder="Full name"
                />
                <Input
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Mobile number"
                  type="tel"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 px-3 text-xs gap-1" onClick={handleSaveProfile} disabled={isSaving}>
                    <Check className="h-3 w-3" /> {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs gap-1" onClick={() => setIsEditing(false)}>
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-display tracking-wide truncate">{user.name}</h2>
                  <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                {(user as any).phone && (
                  <p className="text-xs text-muted-foreground">{(user as any).phone}</p>
                )}
                <Badge variant="secondary" className="mt-1 text-[10px] font-bold uppercase tracking-wider">
                  {user.role.replace("_", " ")}
                </Badge>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 divide-x divide-border bg-background border-b border-border">
        <div className="p-4 text-center">
          <p className="text-xl font-bold text-primary">{confirmedBookings.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Bookings</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xl font-bold text-primary">
            {totalSpent > 0 ? `₹${(totalSpent / 100).toFixed(0)}` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Spent</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xl font-bold text-primary">{myMatch ? "1" : "0"}</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Live</p>
        </div>
      </div>

      <main className="p-4 space-y-4 mt-1">

        {/* My Active Match */}
        {myMatch ? (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">My Live Match</h3>
            <Card className="overflow-hidden border-red-200 dark:border-red-900">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">Live</span>
                  </div>
                  <p className="text-[10px] opacity-70 truncate max-w-[120px]">{myMatch.turfName}</p>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("flex-1 text-center", myMatch.battingTeam === "A" ? "opacity-100" : "opacity-60")}>
                    <p className="text-[11px] font-bold uppercase truncate">{myMatch.teamA}</p>
                    <p className="text-xl font-bold">{myMatch.scoreA}<span className="text-sm font-normal">/{myMatch.wicketsA}</span></p>
                  </div>
                  <span className="text-xs opacity-50">vs</span>
                  <div className={cn("flex-1 text-center", myMatch.battingTeam === "B" ? "opacity-100" : "opacity-60")}>
                    <p className="text-[11px] font-bold uppercase truncate">{myMatch.teamB}</p>
                    <p className="text-xl font-bold">{myMatch.scoreB}<span className="text-sm font-normal">/{myMatch.wicketsB}</span></p>
                  </div>
                </div>
                <p className="text-center text-[11px] opacity-70">{myMatch.overs}</p>
                {myMatch.balls.length > 0 && (
                  <div className="flex gap-1.5 justify-center mt-2">
                    {myMatch.balls.slice(-6).map((b, i) => (
                      <span key={i} className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", ballColor(b.result))}>{b.result}</span>
                    ))}
                  </div>
                )}
                {(myMatch.striker || myMatch.currentBowler) && (
                  <div className="mt-2 pt-2 border-t border-white/20 flex justify-around text-center">
                    {myMatch.striker && (
                      <div>
                        <p className="text-[9px] opacity-60 uppercase">Striker</p>
                        <p className="text-[11px] font-bold">{myMatch.striker}</p>
                      </div>
                    )}
                    {myMatch.nonStriker && (
                      <div>
                        <p className="text-[9px] opacity-60 uppercase">Non-striker</p>
                        <p className="text-[11px] font-bold">{myMatch.nonStriker}</p>
                      </div>
                    )}
                    {myMatch.currentBowler && (
                      <div>
                        <p className="text-[9px] opacity-60 uppercase">Bowler</p>
                        <p className="text-[11px] font-bold">{myMatch.currentBowler}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3">
                <Link href={`/profile/match/${myMatch.id}`}>
                  <Button className="w-full h-9 text-sm font-bold rounded-xl bg-red-600 hover:bg-red-700 gap-2">
                    <Trophy className="h-4 w-4" /> Manage Scorecard
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        ) : (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Live Scoring</h3>
            <Card className="p-4 border-dashed">
              <div className="text-center">
                <Radio className="h-8 w-8 mx-auto text-muted-foreground opacity-40 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No active match</p>
                <p className="text-xs text-muted-foreground/70 mb-3">Start a live scorecard from Community</p>
                <Link href="/community">
                  <Button variant="outline" size="sm" className="gap-2 text-xs font-bold rounded-xl">
                    <Users className="h-3.5 w-3.5" /> Go to Community
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        )}

        {/* Quick Links */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">My Activity</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/bookings" className="block">
              <Card className="p-4 border-none shadow-sm hover:border-primary/50 transition-colors flex flex-col items-center text-center">
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-2 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm">My Bookings</span>
                {confirmedBookings.length > 0 && (
                  <span className="text-xs text-muted-foreground mt-0.5">{confirmedBookings.length} confirmed</span>
                )}
              </Card>
            </Link>
            <Link href="/orders" className="block">
              <Card className="p-4 border-none shadow-sm hover:border-primary/50 transition-colors flex flex-col items-center text-center">
                <div className="h-10 w-10 bg-secondary/10 rounded-full flex items-center justify-center mb-2 text-secondary-foreground">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="font-bold text-sm">My Orders</span>
              </Card>
            </Link>
          </div>
        </div>

        {/* Settings */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Settings</h3>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between border-b border-border/50 hover:bg-muted/30 transition-colors" onClick={() => setIsEditing(true)}>
              <div className="flex items-center gap-3">
                <Pencil className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">Edit Profile</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="p-4 flex items-center justify-between border-b border-border/50">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">Saved Addresses</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">Notifications</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {user.role === "turf_owner" && (
          <Link href="/owner" className="block w-full">
            <Button variant="secondary" className="w-full h-12 rounded-xl font-bold">Owner Portal</Button>
          </Link>
        )}
        {user.role === "admin" && (
          <Link href="/admin" className="block w-full">
            <Button variant="secondary" className="w-full h-12 rounded-xl font-bold">Admin Dashboard</Button>
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

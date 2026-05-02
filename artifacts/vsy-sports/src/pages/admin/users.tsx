import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Search, ShieldAlert, ShieldCheck, Trash2,
  Mail, Phone, Calendar, BookOpen, IndianRupee, Building2,
  Shield, UserCheck, Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function hdr(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500/15 text-red-400 border-red-500/30",
  turf_owner: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  user: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin", turf_owner: "Turf Owner", user: "User",
};

const fmtINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

type RoleFilter = "all" | "user" | "turf_owner" | "admin";

export default function AdminUsers() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all"|"active"|"blocked">("all");
  const [deleteUser, setDeleteUser] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const r = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!token,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  const blockMut = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const r = await fetch(`/api/admin/users/${id}/block`, { method: "PUT", headers: hdr(token!), body: JSON.stringify({ blocked }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Status updated" }); invalidate(); },
  });

  const roleMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const r = await fetch(`/api/admin/users/${id}/role`, { method: "PUT", headers: hdr(token!), body: JSON.stringify({ role }) });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Role updated" }); invalidate(); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: hdr(token!) });
      if (!r.ok) throw new Error((await r.json()).error || "Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "User deleted" }); setDeleteUser(null); invalidate(); },
    onError: (e: any) => toast({ variant: "destructive", title: "Error", description: e.message }),
  });

  const filtered = useMemo(() => {
    return users.filter((u: any) => {
      const q = search.toLowerCase();
      const matchSearch = !search || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || (u.phone || "").includes(q);
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchStatus = statusFilter === "all" || (statusFilter === "blocked" && u.blocked) || (statusFilter === "active" && !u.blocked);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const counts = useMemo(() => ({
    all: users.length,
    user: users.filter((u: any) => u.role === "user").length,
    turf_owner: users.filter((u: any) => u.role === "turf_owner").length,
    admin: users.filter((u: any) => u.role === "admin").length,
    blocked: users.filter((u: any) => u.blocked).length,
    active: users.filter((u: any) => !u.blocked).length,
  }), [users]);

  const totalSpending = useMemo(() => users.reduce((s: number, u: any) => s + (u.totalSpending || 0), 0), [users]);
  const totalBookingsCount = useMemo(() => users.reduce((s: number, u: any) => s + (u.totalBookings || 0), 0), [users]);

  return (
    <div className="p-4 md:p-8 text-white">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">User Management</h2>
          <p className="text-white/40 text-sm mt-0.5">{users.length} total accounts across all roles</p>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-white">{users.length}</p>
          <p className="text-[10px] text-white/30 font-bold uppercase mt-0.5">Total Accounts</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{fmtINR(totalSpending)}</p>
          <p className="text-[10px] text-emerald-400/60 font-bold uppercase mt-0.5">Total Spending</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-400">{totalBookingsCount}</p>
          <p className="text-[10px] text-blue-400/60 font-bold uppercase mt-0.5">Total Bookings</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-red-400">{counts.blocked}</p>
          <p className="text-[10px] text-red-400/60 font-bold uppercase mt-0.5">Blocked Accounts</p>
        </div>
      </div>

      {/* Role filter tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {([
            { v: "all", label: "All", count: counts.all, Icon: Users },
            { v: "user", label: "Users", count: counts.user, Icon: UserCheck },
            { v: "turf_owner", label: "Owners", count: counts.turf_owner, Icon: Building2 },
            { v: "admin", label: "Admins", count: counts.admin, Icon: Shield },
          ] as const).map(({ v, label, count, Icon }) => (
            <button key={v} onClick={() => setRoleFilter(v)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                roleFilter === v ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}>
              <Icon className="h-3 w-3" />
              {label}
              <span className={cn("text-[9px] px-1.5 rounded-full font-black", roleFilter === v ? "bg-white/20 text-white" : "bg-white/5 text-white/30")}>{count}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {(["all","active","blocked"] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all",
                statusFilter === f ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white")}>
              {f} {f !== "all" && <span className={cn("ml-1 text-[9px] px-1 rounded-full", statusFilter === f ? "bg-white/20" : "bg-white/5")}>{counts[f]}</span>}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone..." className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm" />
        </div>
      </div>

      {/* User Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(6)].map((_,i) => <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse"/>)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-20"/>
          <p className="font-bold">No users found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((user: any) => (
            <div key={user.id} className={cn("bg-white/5 border rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group hover:border-white/20 transition-all",
              user.blocked ? "border-red-500/20" : "border-white/10")}>

              {/* Status indicator */}
              {user.blocked && <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500/40" />}

              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0",
                  user.role === "admin" ? "bg-red-500/20 text-red-400" :
                  user.role === "turf_owner" ? "bg-violet-500/20 text-violet-400" :
                  "bg-blue-500/20 text-blue-400")}>
                  {user.name?.slice(0,2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white truncate">{user.name}</h3>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0", ROLE_COLORS[user.role])}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                  {user.businessName && <p className="text-[10px] text-white/30 truncate">{user.businessName}</p>}
                  <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5"><Mail className="h-2.5 w-2.5"/>{user.email}</p>
                  {user.phone && <p className="text-[11px] text-white/30 flex items-center gap-1"><Phone className="h-2.5 w-2.5"/>{user.phone}</p>}
                </div>

                {/* Status dot */}
                <div className={cn("h-2 w-2 rounded-full flex-shrink-0 mt-1", user.blocked ? "bg-red-400" : "bg-emerald-400")} />
              </div>

              {/* Stats */}
              <div className="flex gap-2 text-[10px]">
                <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/25 font-bold uppercase">Bookings</p>
                  <p className="font-black text-white/70 mt-0.5">{user.totalBookings || 0}</p>
                </div>
                <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/25 font-bold uppercase">Spent</p>
                  <p className="font-black text-emerald-400 mt-0.5">{fmtINR(user.totalSpending || 0)}</p>
                </div>
                <div className="flex-1 bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-white/25 font-bold uppercase">Joined</p>
                  <p className="font-black text-white/50 mt-0.5 text-[9px]">{user.createdAt ? format(new Date(user.createdAt), "MMM yy") : "—"}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                <Select defaultValue={user.role} onValueChange={role => roleMut.mutate({ id: user.id, role })}>
                  <SelectTrigger className="h-7 flex-1 text-[11px] bg-white/5 border-white/10 text-white">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="turf_owner">Turf Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost"
                  className={cn("h-7 w-7 rounded-lg flex-shrink-0 transition-colors",
                    user.blocked ? "text-emerald-400 hover:bg-emerald-500/10" : "text-amber-400 hover:bg-amber-500/10")}
                  onClick={() => blockMut.mutate({ id: user.id, blocked: !user.blocked })}
                  disabled={blockMut.isPending}>
                  {user.blocked ? <ShieldCheck className="h-3.5 w-3.5"/> : <ShieldAlert className="h-3.5 w-3.5"/>}
                </Button>
                {user.role !== "admin" && (
                  <Button size="icon" variant="ghost"
                    className="h-7 w-7 rounded-lg flex-shrink-0 text-red-400/50 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => setDeleteUser(user)}>
                    <Trash2 className="h-3.5 w-3.5"/>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm */}
      {deleteUser && (
        <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
          <DialogContent className="sm:max-w-sm bg-[#1a1d27] border-red-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2"><Trash2 className="h-5 w-5"/> Delete User Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="font-bold text-white">{deleteUser.name}</p>
                <p className="text-sm text-white/50">{deleteUser.email}</p>
                <p className="text-sm text-red-300/70 mt-2">This permanently deletes the account. Booking history is preserved.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-white/15 text-white hover:bg-white/10" onClick={() => setDeleteUser(null)}>Cancel</Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700 font-bold" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(deleteUser.id)}>
                  {deleteMut.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

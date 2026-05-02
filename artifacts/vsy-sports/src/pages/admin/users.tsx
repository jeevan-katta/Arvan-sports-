import { useState } from "react";
import { useListUsers, useBlockUser, useUpdateUserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, ShieldCheck, Search, Users, Building2, Shield } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListUsersQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

type RoleFilter = "all" | "user" | "turf_owner" | "admin";

export default function AdminUsers() {
  const { data: users, isLoading } = useListUsers();
  const blockMutation = useBlockUser();
  const roleMutation = useUpdateUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const handleBlock = (id: number, currentBlocked: boolean) => {
    blockMutation.mutate({ id, data: { blocked: !currentBlocked } }, {
      onSuccess: () => {
        toast({ title: `User ${!currentBlocked ? "blocked" : "unblocked"}` });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    });
  };

  const handleRoleChange = (id: number, role: "user" | "turf_owner" | "admin") => {
    roleMutation.mutate({ id, data: { role } }, {
      onSuccess: () => {
        toast({ title: "Role updated" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
    });
  };

  const filtered = (users || []).filter(u => {
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || (u.phone || "").includes(q);
    return matchRole && matchSearch;
  });

  const counts = {
    all: users?.length || 0,
    user: users?.filter(u => u.role === "user").length || 0,
    turf_owner: users?.filter(u => u.role === "turf_owner").length || 0,
    admin: users?.filter(u => u.role === "admin").length || 0,
  };

  const filterTabs = [
    { label: "All", value: "all" as RoleFilter, icon: Users, count: counts.all },
    { label: "Users", value: "user" as RoleFilter, icon: Users, count: counts.user },
    { label: "Owners", value: "turf_owner" as RoleFilter, icon: Building2, count: counts.turf_owner },
    { label: "Admins", value: "admin" as RoleFilter, icon: Shield, count: counts.admin },
  ];

  return (
    <div className="p-4 md:p-8 text-white">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">User Management</h2>
          <p className="text-white/40 text-sm mt-0.5">{users?.length || 0} registered users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 flex-shrink-0">
          {filterTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                roleFilter === tab.value ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white"
              )}
            >
              {tab.label}
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-black",
                roleFilter === tab.value ? "bg-white/20 text-white" : "bg-white/5 text-white/30"
              )}>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/20 h-9 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">User</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Contact</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Role</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">Joined</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-white/30">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-white/30 text-sm">No users found</td></tr>
              )}
              {!isLoading && filtered.map((user: any) => (
                <tr key={user.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-violet-500/20 flex items-center justify-center font-black text-sm text-primary flex-shrink-0">
                        {user.name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{user.name}</p>
                        {(user as any).businessName && <p className="text-[10px] text-white/30">{(user as any).businessName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-white/60 text-sm">{user.email}</p>
                    {user.phone && <p className="text-white/30 text-xs">{user.phone}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <Select defaultValue={user.role} onValueChange={(val) => handleRoleChange(user.id, val as any)}>
                      <SelectTrigger className="h-8 w-32 text-xs bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="turf_owner">Turf Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full",
                      user.blocked ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", user.blocked ? "bg-red-400" : "bg-emerald-400")} />
                      {user.blocked ? "Blocked" : "Active"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white/30 text-xs">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="ghost" size="sm"
                      className={cn("h-8 text-xs font-bold rounded-lg",
                        user.blocked
                          ? "text-emerald-400 hover:bg-emerald-500/10"
                          : "text-red-400 hover:bg-red-500/10"
                      )}
                      onClick={() => handleBlock(user.id, user.blocked || false)}
                      disabled={blockMutation.isPending}
                    >
                      {user.blocked ? <ShieldCheck className="h-3.5 w-3.5 mr-1" /> : <ShieldAlert className="h-3.5 w-3.5 mr-1" />}
                      {user.blocked ? "Unblock" : "Block"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

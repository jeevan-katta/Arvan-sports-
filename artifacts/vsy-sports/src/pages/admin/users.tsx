import { useState } from "react";
import { useListUsers, useBlockUser, useUpdateUserRole } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, ShieldCheck, UserCog } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { getListUsersQueryKey } from "@workspace/api-client-react";

export default function AdminUsers() {
  const { data: users, isLoading } = useListUsers();
  const blockMutation = useBlockUser();
  const roleMutation = useUpdateUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBlock = (id: number, currentBlocked: boolean) => {
    blockMutation.mutate({
      id,
      data: { blocked: !currentBlocked }
    }, {
      onSuccess: () => {
        toast({ title: `User ${!currentBlocked ? 'blocked' : 'unblocked'}` });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      }
    });
  };

  const handleRoleChange = (id: number, role: "user" | "turf_owner" | "admin") => {
    roleMutation.mutate({
      id,
      data: { role }
    }, {
      onSuccess: () => {
        toast({ title: "Role updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      }
    });
  };

  if (isLoading) return <div className="p-8">Loading users...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b border-border">
          <CardTitle className="text-base font-bold flex items-center">
            <UserCog className="h-5 w-5 mr-2 text-primary" /> All Users
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">#{user.id}</td>
                  <td className="px-4 py-3 font-bold">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    <Select 
                      defaultValue={user.role} 
                      onValueChange={(val) => handleRoleChange(user.id, val as any)}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="turf_owner">Turf Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.blocked ? "destructive" : "outline"} className="text-[10px] uppercase font-bold">
                      {user.blocked ? "Blocked" : "Active"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={user.blocked ? "text-green-600 hover:text-green-700" : "text-destructive hover:text-destructive"}
                      onClick={() => handleBlock(user.id, user.blocked || false)}
                      disabled={blockMutation.isPending}
                    >
                      {user.blocked ? <ShieldCheck className="h-4 w-4 mr-1" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
                      {user.blocked ? "Unblock" : "Block"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
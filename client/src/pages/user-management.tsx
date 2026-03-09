import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUsers, useUpdateUserRole, useDeleteUser } from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Users, Shield, User } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const { data: currentUser } = useAuth();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();

  async function handleRoleChange(userId: number, role: string) {
    try {
      await updateRole.mutateAsync({ id: userId, role });
      toast({ title: "Role updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleDelete(userId: number) {
    try {
      await deleteUser.mutateAsync(userId);
      toast({ title: "User deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
          User Management
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage users and their roles
        </p>
      </div>

      {!users || users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users"
          description="No users have registered yet."
          testId="empty-users"
        />
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <Card key={user.id} data-testid={`card-user-${user.id}`}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {user.role === "admin" ? (
                      <Shield className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold" data-testid={`text-username-${user.id}`}>{user.username}</p>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      data-testid={`badge-role-${user.id}`}
                    >
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(val) => handleRoleChange(user.id, val)}
                    disabled={user.id === currentUser?.id}
                  >
                    <SelectTrigger className="w-28" data-testid={`select-role-${user.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(user.id)}
                    disabled={user.id === currentUser?.id}
                    data-testid={`button-delete-user-${user.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useUsers,
  useUpdateUserRole,
  useUpdateUserPassword,
  useDeleteUser,
  useCreateUser,
  useUserChannels,
  useUpdateUserChannels,
} from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Users, Shield, User, Plus, Hash, Pencil, X, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { SafeUser } from "@shared/schema";

interface ChannelEntry {
  name: string;
  webhookUrl: string;
}

function ChannelEditor({
  channels,
  onChange,
}: {
  channels: ChannelEntry[];
  onChange: (channels: ChannelEntry[]) => void;
}) {
  function addChannel() {
    onChange([...channels, { name: "", webhookUrl: "" }]);
  }

  function removeChannel(index: number) {
    onChange(channels.filter((_, i) => i !== index));
  }

  function updateChannel(index: number, field: "name" | "webhookUrl", value: string) {
    const updated = channels.map((ch, i) =>
      i === index ? { ...ch, [field]: value } : ch
    );
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Discord Channels</Label>
          <p className="text-sm text-muted-foreground mt-0.5">Assign Discord webhook channels to this user</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addChannel}
          className="gap-1.5"
          data-testid="button-add-channel"
        >
          <Plus className="h-3.5 w-3.5" /> Add Channel
        </Button>
      </div>
      {channels.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Hash className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No channels added yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add Channel" to assign Discord webhooks.</p>
        </div>
      )}
      {channels.map((ch, index) => (
        <Card key={index} data-testid={`channel-entry-${index}`}>
          <CardContent className="pt-4 pb-4 relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => removeChannel(index)}
              data-testid={`button-remove-channel-${index}`}
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Channel Name</Label>
                <Input
                  placeholder="e.g. trading-signals"
                  value={ch.name}
                  onChange={(e) => updateChannel(index, "name", e.target.value)}
                  data-testid={`input-channel-name-${index}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Webhook URL</Label>
                <Input
                  placeholder="https://discord.com/api/webhooks/..."
                  value={ch.webhookUrl}
                  onChange={(e) => updateChannel(index, "webhookUrl", e.target.value)}
                  data-testid={`input-channel-webhook-${index}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CreateUserPage() {
  const [, navigate] = useLocation();
  const createUser = useCreateUser();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("user");
  const [channels, setChannels] = useState<ChannelEntry[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: "Username is required", variant: "destructive" });
      return;
    }
    if (!password || password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    const invalidChannels = channels.filter(ch => ch.name.trim() && !ch.webhookUrl.trim());
    if (invalidChannels.length > 0) {
      toast({ title: "Missing webhook URL", description: "Each channel needs a webhook URL", variant: "destructive" });
      return;
    }

    const validChannels = channels.filter(ch => ch.name.trim() && ch.webhookUrl.trim());

    try {
      await createUser.mutateAsync({
        username: username.trim(),
        password,
        role,
        channels: validChannels,
      });
      toast({ title: "User created successfully" });
      navigate("/users");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/users")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">Create User</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Add a new user account with Discord channel webhooks</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  data-testid="input-new-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger data-testid="select-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <ChannelEditor channels={channels} onChange={setChannels} />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={createUser.isPending} data-testid="button-submit-user">
            {createUser.isPending ? "Creating..." : "Create User"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/users")} data-testid="button-cancel">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export function EditUserPage({ userId }: { userId: number }) {
  const [, navigate] = useLocation();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: existingChannels, isLoading: channelsLoading } = useUserChannels(userId);
  const updateRole = useUpdateUserRole();
  const updatePassword = useUpdateUserPassword();
  const updateChannels = useUpdateUserChannels();
  const { toast } = useToast();
  const { data: currentUser } = useAuth();

  const user = users?.find(u => u.id === userId);

  const [role, setRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [channels, setChannels] = useState<ChannelEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (user && !initialized) {
      setRole(user.role);
    }
  }, [user, initialized]);

  useEffect(() => {
    if (existingChannels && !channelsLoading && !initialized) {
      setChannels(existingChannels.map(ch => ({ name: ch.name, webhookUrl: ch.webhookUrl })));
      setInitialized(true);
    }
  }, [existingChannels, channelsLoading, initialized]);

  async function handleSave() {
    if (!user) return;

    const invalidChannels = channels.filter(ch => ch.name.trim() && !ch.webhookUrl.trim());
    if (invalidChannels.length > 0) {
      toast({ title: "Missing webhook URL", description: "Each channel needs a webhook URL", variant: "destructive" });
      return;
    }

    if (newPassword.trim() && newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    const validChannels = channels.filter(ch => ch.name.trim() && ch.webhookUrl.trim());

    try {
      if (role !== user.role) {
        await updateRole.mutateAsync({ id: user.id, role });
      }
      if (newPassword.trim()) {
        await updatePassword.mutateAsync({ id: user.id, password: newPassword });
      }
      await updateChannels.mutateAsync({ userId: user.id, channels: validChannels });
      toast({ title: "User updated successfully" });
      navigate("/users");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  const isSaving = updateRole.isPending || updatePassword.isPending || updateChannels.isPending;
  const isSelf = currentUser?.id === userId;
  const isLoading = usersLoading || channelsLoading;

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/users")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold">User not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/users")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">Edit User</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Editing <span className="font-medium text-foreground">{user.username}</span>
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={user.username} disabled className="bg-muted" data-testid="input-username" />
                <p className="text-xs text-muted-foreground">Username cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole} disabled={isSelf}>
                  <SelectTrigger data-testid="select-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {isSelf && <p className="text-xs text-muted-foreground">You cannot change your own role</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Leave blank to keep current password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Minimum 6 characters. Leave blank to keep the current password.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <ChannelEditor channels={channels} onChange={setChannels} />
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-user">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/users")} data-testid="button-cancel">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const { data: currentUser } = useAuth();
  const deleteUser = useDeleteUser();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [deleteTarget, setDeleteTarget] = useState<SafeUser | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteUser.mutateAsync(deleteTarget.id);
      toast({ title: "User deleted" });
      setDeleteTarget(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="text-page-title">
            User Management
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Manage users, roles, and Discord channel webhooks
          </p>
        </div>
        <Button onClick={() => navigate("/users/create")} data-testid="button-create-user">
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      {!users || users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users"
          description="Add your first user to get started."
          testId="empty-users"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="grid-users">
          {users.map(user => (
            <UserCard
              key={user.id}
              user={user}
              isSelf={user.id === currentUser?.id}
              onEdit={() => navigate(`/users/${user.id}/edit`)}
              onDelete={() => setDeleteTarget(user)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{deleteTarget?.username}</span>? This will also remove all their Discord channels. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteUser.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserCard({
  user,
  isSelf,
  onEdit,
  onDelete,
}: {
  user: SafeUser;
  isSelf: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const channelCount = user.discordChannels?.length ?? 0;
  const channelNames = (user.discordChannels ?? []).map(ch => ch.name).filter(Boolean);

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden hover:border-border/80 transition-colors"
      data-testid={`card-user-${user.id}`}
    >
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted shrink-0">
            {user.role === "admin" ? (
              <Shield className="h-4.5 w-4.5 text-primary" />
            ) : (
              <User className="h-4.5 w-4.5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" data-testid={`text-username-${user.id}`}>
              {user.username}
              {isSelf && <span className="text-xs font-normal text-muted-foreground ml-1.5">(you)</span>}
            </p>
            <Badge
              variant={user.role === "admin" ? "default" : "secondary"}
              className="text-[10px] mt-0.5"
              data-testid={`badge-role-${user.id}`}
            >
              {user.role}
            </Badge>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="py-2 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`text-channel-count-${user.id}`}>
            <Hash className="h-3.5 w-3.5" />
            <span>{channelCount} channel{channelCount !== 1 ? "s" : ""}</span>
          </div>
          {channelNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {channelNames.map((name, i) => (
                <Badge key={i} variant="outline" className="text-[10px] font-normal">
                  #{name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-xs h-8 flex-1 gap-1.5"
            data-testid={`button-edit-user-${user.id}`}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isSelf}
            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
            data-testid={`button-delete-user-${user.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

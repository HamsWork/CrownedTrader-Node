import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useUsers,
  useUpdateUserRole,
  useDeleteUser,
  useCreateUser,
  useUserChannels,
  useUpdateUserChannels,
} from "@/hooks/use-signals";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Users, Shield, User, Plus, Hash, Pencil, X } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { SafeUser, DiscordChannel } from "@shared/schema";

interface ChannelEntry {
  id?: number;
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Discord Channels</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addChannel}
          className="text-xs gap-1"
          data-testid="button-add-channel"
        >
          <Plus className="h-3 w-3" /> Add Channel
        </Button>
      </div>
      {channels.length === 0 && (
        <p className="text-xs text-muted-foreground">No channels added yet. Click "Add Channel" to assign Discord webhooks.</p>
      )}
      {channels.map((ch, index) => (
        <div key={index} className="rounded-md border border-border p-3 space-y-2 relative" data-testid={`channel-entry-${index}`}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => removeChannel(index)}
            data-testid={`button-remove-channel-${index}`}
          >
            <X className="h-3 w-3" />
          </Button>
          <div className="space-y-1">
            <Label className="text-xs">Channel Name</Label>
            <Input
              placeholder="e.g. trading-signals"
              value={ch.name}
              onChange={(e) => updateChannel(index, "name", e.target.value)}
              data-testid={`input-channel-name-${index}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Webhook URL</Label>
            <Input
              placeholder="https://discord.com/api/webhooks/..."
              value={ch.webhookUrl}
              onChange={(e) => updateChannel(index, "webhookUrl", e.target.value)}
              data-testid={`input-channel-webhook-${index}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: SafeUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: existingChannels, isLoading: channelsLoading } = useUserChannels(open ? user.id : null);
  const updateRole = useUpdateUserRole();
  const updateChannels = useUpdateUserChannels();
  const { toast } = useToast();
  const { data: currentUser } = useAuth();

  const [role, setRole] = useState(user.role);
  const [channels, setChannels] = useState<ChannelEntry[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (existingChannels && !channelsLoading && !initialized) {
      setChannels(existingChannels.map(ch => ({ id: ch.id, name: ch.name, webhookUrl: ch.webhookUrl })));
      setInitialized(true);
    }
  }, [existingChannels, channelsLoading, initialized]);

  useEffect(() => {
    if (!open) {
      setInitialized(false);
    }
  }, [open]);

  async function handleSave() {
    const invalidChannels = channels.filter(ch => ch.name.trim() && !ch.webhookUrl.trim());
    if (invalidChannels.length > 0) {
      toast({ title: "Missing webhook URL", description: "Each channel needs a webhook URL", variant: "destructive" });
      return;
    }

    const validChannels = channels.filter(ch => ch.name.trim() && ch.webhookUrl.trim());

    try {
      if (role !== user.role) {
        await updateRole.mutateAsync({ id: user.id, role });
      }
      await updateChannels.mutateAsync({ userId: user.id, channels: validChannels });
      toast({ title: "User updated" });
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update user";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  const isSaving = updateRole.isPending || updateChannels.isPending;
  const isSelf = currentUser?.id === user.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User — {user.username}</DialogTitle>
          <DialogDescription>Update role and manage Discord channel webhooks.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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
            {isSelf && <p className="text-xs text-muted-foreground">You cannot change your own role.</p>}
          </div>

          {channelsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20" />
            </div>
          ) : (
            <ChannelEditor channels={channels} onChange={setChannels} />
          )}

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={isSaving}
            data-testid="button-save-user"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const { data: currentUser } = useAuth();
  const deleteUser = useDeleteUser();
  const createUser = useCreateUser();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newChannels, setNewChannels] = useState<ChannelEntry[]>([]);

  async function handleDelete(userId: number) {
    try {
      await deleteUser.mutateAsync(userId);
      toast({ title: "User deleted" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      toast({ title: "Error", description: message, variant: "destructive" });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      toast({ title: "Username and password are required", variant: "destructive" });
      return;
    }

    const invalidChannels = newChannels.filter(ch => ch.name.trim() && !ch.webhookUrl.trim());
    if (invalidChannels.length > 0) {
      toast({ title: "Missing webhook URL", description: "Each channel needs a webhook URL", variant: "destructive" });
      return;
    }

    const validChannels = newChannels.filter(ch => ch.name.trim() && ch.webhookUrl.trim());

    try {
      await createUser.mutateAsync({
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        channels: validChannels,
      });
      toast({ title: "User created" });
      setNewUsername("");
      setNewPassword("");
      setNewRole("user");
      setNewChannels([]);
      setCreateOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      toast({ title: "Error", description: message, variant: "destructive" });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
            User Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage users, roles, and Discord channel webhooks
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user account with optional Discord channel webhooks.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-username">Username</Label>
                <Input
                  id="new-username"
                  placeholder="Enter username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  data-testid="input-new-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ChannelEditor channels={newChannels} onChange={setNewChannels} />

              <Button type="submit" className="w-full" disabled={createUser.isPending} data-testid="button-submit-user">
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!users || users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users"
          description="Add your first user to get started."
          testId="empty-users"
        />
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <UserCard
              key={user.id}
              user={user}
              isSelf={user.id === currentUser?.id}
              onEdit={() => setEditingUser(user)}
              onDelete={() => handleDelete(user.id)}
            />
          ))}
        </div>
      )}

      {editingUser && (
        <EditUserDialog
          key={editingUser.id}
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => { if (!open) setEditingUser(null); }}
        />
      )}
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
  const { data: channels } = useUserChannels(user.id);
  const channelCount = channels?.length ?? 0;

  return (
    <Card data-testid={`card-user-${user.id}`}>
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
            <div className="flex items-center gap-2 mt-0.5">
              <Badge
                variant={user.role === "admin" ? "default" : "secondary"}
                data-testid={`badge-role-${user.id}`}
              >
                {user.role}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-channel-count-${user.id}`}>
                <Hash className="h-3 w-3" />
                {channelCount} channel{channelCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="gap-1.5"
            data-testid={`button-edit-user-${user.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isSelf}
            data-testid={`button-delete-user-${user.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

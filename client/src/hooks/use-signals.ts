import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Signal, SignalType, SafeUser, UserDiscordChannel } from "@shared/schema";

export function useSignalTypes() {
  return useQuery<SignalType[]>({
    queryKey: ["/api/signal-types"],
  });
}

export function useSignals() {
  return useQuery<Signal[]>({
    queryKey: ["/api/signals"],
  });
}

export function useStats() {
  return useQuery<{
    totalSignals: number;
    totalSignalTypes: number;
    sentToDiscord: number;
    recentSignals: Signal[];
  }>({
    queryKey: ["/api/stats"],
  });
}

export function useUsers() {
  return useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });
}

export function useCreateSignal() {
  return useMutation({
    mutationFn: async (data: { signalTypeId: number; data: Record<string, string>; discordChannelName?: string | null }) => {
      const res = await apiRequest("POST", "/api/signals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useCreateSignalType() {
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/signal-types", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signal-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useUpdateSignalType() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/signal-types/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signal-types"] });
    },
  });
}

export function useDeleteSignalType() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/signal-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/signal-types"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useUserChannels(userId: number | null) {
  return useQuery<UserDiscordChannel[]>({
    queryKey: ["/api/users", userId, "channels"],
    queryFn: async () => {
      if (!userId) return [];
      const res = await fetch(`/api/users/${userId}/channels`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch channels");
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useCreateUser() {
  return useMutation({
    mutationFn: async (data: { username: string; password: string; role: string; channels?: Array<{ name: string; webhookUrl: string }> }) => {
      const res = await apiRequest("POST", "/api/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useUpdateUserRole() {
  return useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });
}

export function useUpdateUserPassword() {
  return useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}/password`, { password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });
}

export function useUpdateUserChannels() {
  return useMutation({
    mutationFn: async ({ userId, channels }: { userId: number; channels: Array<{ name: string; webhookUrl: string }> }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/channels`, { channels });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.userId, "channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useDeleteUser() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

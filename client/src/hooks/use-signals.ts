import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Signal, SignalType, DiscordChannel, SafeUser } from "@shared/schema";

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

export function useDiscordChannels() {
  return useQuery<DiscordChannel[]>({
    queryKey: ["/api/discord-channels"],
  });
}

export function useStats() {
  return useQuery<{
    totalSignals: number;
    totalSignalTypes: number;
    totalChannels: number;
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
    mutationFn: async (data: { signalTypeId: number; data: Record<string, string>; discordChannelId?: number | null }) => {
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

export function useCreateDiscordChannel() {
  return useMutation({
    mutationFn: async (data: { name: string; webhookUrl: string }) => {
      const res = await apiRequest("POST", "/api/discord-channels", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discord-channels"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });
}

export function useDeleteDiscordChannel() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/discord-channels/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discord-channels"] });
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

export function useDeleteUser() {
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });
}

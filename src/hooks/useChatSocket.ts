"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

// Singleton — one connection for the whole app lifecycle
let socketInstance: Socket | null = null;

export function useChatSocket() {
  const { token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
      });
    }

    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onUserOnline  = ({ userId }: { userId: number }) =>
      setOnlineUsers(prev => new Set([...prev, userId]));
    const onUserOffline = ({ userId }: { userId: number }) =>
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; });

    socketInstance.on("connect",      onConnect);
    socketInstance.on("disconnect",   onDisconnect);
    socketInstance.on("user:online",  onUserOnline);
    socketInstance.on("user:offline", onUserOffline);

    if (socketInstance.connected) setIsConnected(true);

    return () => {
      // Off only — keep singleton alive across component unmounts
      socketInstance?.off("connect",      onConnect);
      socketInstance?.off("disconnect",   onDisconnect);
      socketInstance?.off("user:online",  onUserOnline);
      socketInstance?.off("user:offline", onUserOffline);
    };
  }, [token]);

  const joinConversation  = (uuid: string) => socketInstance?.emit("conversation:join", uuid);
  const leaveConversation = (uuid: string) => socketInstance?.emit("conversation:leave", uuid);

  const sendMessage = (conversationUuid: string, content: string, replyToId?: string) =>
    socketInstance?.emit("message:send", { conversationUuid, content, replyToId });

  const startTyping = (conversationUuid: string) => socketInstance?.emit("typing:start", conversationUuid);
  const stopTyping  = (conversationUuid: string) => socketInstance?.emit("typing:stop", conversationUuid);

  const markRead = (conversationUuid: string) =>
    socketInstance?.emit("message:read", { conversationUuid });

  const reactToMessage = (messageUuid: string, emoji: string, conversationUuid: string) =>
    socketInstance?.emit("message:react", { messageUuid, emoji, conversationUuid });

  const checkOnlineStatus = (userIds: number[]) =>
    socketInstance?.emit("users:online_check", userIds);

  // Returns a cleanup function — call it in useEffect cleanup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEvent = (event: string, handler: (data: any) => void) => {
    socketInstance?.on(event, handler);
    return () => socketInstance?.off(event, handler);
  };

  return {
    isConnected,
    onlineUsers,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markRead,
    reactToMessage,
    checkOnlineStatus,
    onEvent,
  };
}

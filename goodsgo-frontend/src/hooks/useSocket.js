import { useEffect } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../stores/useAuthStore';
import useSocketStore from '../stores/useSocketStore';

/**
 * Manages the socket.io-client connection lifecycle.
 * Connects when the user becomes authenticated; disconnects on logout or session expiry.
 *
 * Authentication protocol (matches socket.handler.js):
 *   1. Connect to server (unauthenticated socket).
 *   2. On 'connect', emit 'authenticate' with { token: accessToken }.
 *   3. On 'authenticated' response, add socket to store (now safe to use for chat).
 *   4. On 'auth_error', disconnect and clear store.
 *
 * Called exactly once from SocketContext — never call directly from components.
 * Components that need the socket read it from useSocketStore.
 */
export default function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setSocket = useSocketStore((s) => s.setSocket);
  const clearSocket = useSocketStore((s) => s.clearSocket);
  const existingSocket = useSocketStore((s) => s.socket);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (existingSocket) {
        existingSocket.disconnect();
        clearSocket();
      }
      return;
    }

    // In local dev VITE_API_URL is empty; connect to same origin so the Vite
    // proxy can forward /socket.io traffic to the backend.
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    // Step 1: connection established — socket is unauthenticated at this point.
    // Emit 'authenticate' so the backend sets socket.userId and registers
    // domain-specific handlers (chat, notifications). Without this step,
    // all socket event handlers on the server are gated by `if (!socket.userId) return`
    // and silently no-op.
    socket.on('connect', () => {
      socket.emit('authenticate', { token: accessToken });
    });

    // Step 2: server confirmed authentication — safe to expose socket to the app.
    socket.on('authenticated', () => {
      setSocket(socket);
    });

    // Step 3: server rejected authentication — disconnect cleanly.
    socket.on('auth_error', ({ message }) => {
      console.error('[Socket] Authentication failed:', message);
      socket.disconnect();
      clearSocket();
    });

    socket.on('disconnect', () => {
      clearSocket();
    });

    return () => {
      socket.disconnect();
      clearSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);
}

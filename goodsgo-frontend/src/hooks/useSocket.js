import { useEffect } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../stores/useAuthStore';
import useSocketStore from '../stores/useSocketStore';

/**
 * Manages the socket.io-client connection lifecycle.
 * Connects when the user becomes authenticated; disconnects on logout or session expiry.
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

    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token: accessToken },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setSocket(socket);
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

import { create } from 'zustand';

/**
 * Zustand store for the socket.io connection reference.
 * Only useSocket (called from SocketContext) should write to this store.
 * Components read the socket from here to emit events.
 */
const useSocketStore = create((set) => ({
  socket: null,
  isConnected: false,

  /** Store the connected socket instance. */
  setSocket: (socket) => set({ socket, isConnected: true }),

  /** Clear the socket reference on disconnect or logout. */
  clearSocket: () => set({ socket: null, isConnected: false }),
}));

export default useSocketStore;

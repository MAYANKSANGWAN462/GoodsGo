import { createContext } from 'react';
import PropTypes from 'prop-types';
import useSocket from '../hooks/useSocket';

export const SocketContext = createContext(null);

/**
 * SocketProvider initialises and manages the socket.io-client connection.
 * Wraps the full app (inside AuthProvider so it can read isAuthenticated).
 * Components access the socket via useSocketStore — not via this context.
 */
export function SocketProvider({ children }) {
  useSocket();

  return (
    <SocketContext.Provider value={null}>
      {children}
    </SocketContext.Provider>
  );
}

SocketProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

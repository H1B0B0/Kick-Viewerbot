"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import LocalServiceConnector, { ConnectionStatus } from '@/services/LocalServiceConnector';

interface LocalServiceContextType {
  connector: LocalServiceConnector | null;
  status: ConnectionStatus;
  baseUrl: string;
  isConnected: boolean;
  reconnect: () => Promise<void>;
}

const LocalServiceContext = createContext<LocalServiceContextType>({
  connector: null,
  status: 'disconnected',
  baseUrl: '',
  isConnected: false,
  reconnect: async () => {},
});

export function useLocalService() {
  return useContext(LocalServiceContext);
}

interface LocalServiceProviderProps {
  children: ReactNode;
}

export function LocalServiceProvider({ children }: LocalServiceProviderProps) {
  const [connector, setConnector] = useState<LocalServiceConnector | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [baseUrl, setBaseUrl] = useState<string>('');

  useEffect(() => {
    const newConnector = new LocalServiceConnector({
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'connected') {
          setBaseUrl(newConnector.getBaseUrl());
        }
      },
    });

    setConnector(newConnector);

    // Auto-connect on mount
    newConnector.connect();

    // Start periodic stats requests when connected
    const statsInterval = setInterval(() => {
      if (newConnector.getStatus() === 'connected') {
        newConnector.requestStats();
      }
    }, 2000);

    return () => {
      clearInterval(statsInterval);
      newConnector.disconnect();
    };
  }, []);

  const reconnect = async () => {
    if (connector) {
      await connector.connect();
    }
  };

  return (
    <LocalServiceContext.Provider
      value={{
        connector,
        status,
        baseUrl,
        isConnected: status === 'connected',
        reconnect,
      }}
    >
      {children}
    </LocalServiceContext.Provider>
  );
}

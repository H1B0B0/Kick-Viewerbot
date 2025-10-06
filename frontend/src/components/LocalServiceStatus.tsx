"use client";
import { useEffect, useState } from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import LocalServiceConnector, { ConnectionStatus } from "@/services/LocalServiceConnector";

interface LocalServiceStatusProps {
  connector: LocalServiceConnector | null;
  onConnectorReady?: (connector: LocalServiceConnector) => void;
}

export function LocalServiceStatus({ connector: initialConnector, onConnectorReady }: LocalServiceStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connector, setConnector] = useState<LocalServiceConnector | null>(initialConnector);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Create connector if not provided
    if (!connector) {
      const newConnector = new LocalServiceConnector({
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
        },
        onError: (error) => {
          setErrorMessage(error);
        },
      });
      setConnector(newConnector);

      // Auto-connect
      newConnector.connect().then((success) => {
        if (success) {
          onConnectorReady?.(newConnector);
        }
      });

      return () => {
        newConnector.disconnect();
      };
    } else {
      setStatus(connector.getStatus());
    }
  }, []);

  const getStatusColor = (): "success" | "warning" | "danger" | "default" => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'connecting':
        return 'warning';
      case 'error':
      case 'disconnected':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'connected':
        return 'Connected to Local Service';
      case 'connecting':
        return 'Connecting to Local Service...';
      case 'error':
        return 'Failed to Connect';
      case 'disconnected':
        return 'Disconnected from Local Service';
      default:
        return 'Unknown Status';
    }
  };

  const handleRetry = () => {
    if (connector) {
      connector.connect();
    }
  };

  return (
    <Card className="border-none bg-background/60 backdrop-blur-xl">
      <CardBody className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Chip
            color={getStatusColor()}
            variant="dot"
            size="sm"
          >
            {getStatusText()}
          </Chip>
          {status === 'connected' && connector && (
            <span className="text-xs text-default-500">
              @ {connector.getBaseUrl()}
            </span>
          )}
        </div>

        {(status === 'error' || status === 'disconnected') && (
          <button
            onClick={handleRetry}
            className="px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            Retry Connection
          </button>
        )}
      </CardBody>

      {errorMessage && status === 'error' && (
        <CardBody className="pt-0 pb-4">
          <p className="text-xs text-danger">{errorMessage}</p>
          <p className="text-xs text-default-500 mt-2">
            Make sure the Python backend is running on your local machine.
          </p>
        </CardBody>
      )}
    </Card>
  );
}

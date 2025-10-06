"use client";
import { Chip } from "@heroui/react";
import { ConnectionStatus } from "@/services/WebSocketService";

interface WebSocketStatusProps {
  status: ConnectionStatus;
  currentUrl?: string;
  onRetry?: () => void;
}

export function WebSocketStatus({ status, currentUrl, onRetry }: WebSocketStatusProps) {
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
        return 'Connecté';
      case 'connecting':
        return 'Connexion...';
      case 'error':
        return 'Erreur de connexion';
      case 'disconnected':
        return 'Déconnecté';
      default:
        return 'Inconnu';
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Chip
        color={getStatusColor()}
        variant="dot"
        size="sm"
      >
        {getStatusText()}
      </Chip>

      {status === 'connected' && currentUrl && (
        <span className="text-xs text-default-500">
          {currentUrl}
        </span>
      )}

      {(status === 'error' || status === 'disconnected') && onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
        >
          Reconnecter
        </button>
      )}
    </div>
  );
}

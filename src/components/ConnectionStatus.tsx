import { Wifi, WifiOff, Loader2, AlertCircle, Circle } from 'lucide-react';

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error" | "offline" | "syncing";

interface ConnectionStatusProps {
  status: ConnectionStatus;
  pendingOps?: number;
}

export default function ConnectionStatus({ status, pendingOps }: ConnectionStatusProps) {
  const statusConfig = {
    connected: {
      text: "Connected",
      color: "text-green-600",
      icon: Wifi,
      iconBg: "text-green-600",
    },
    connecting: {
      text: "Connecting...",
      color: "text-yellow-600",
      icon: Loader2,
      iconBg: "text-yellow-600",
    },
    disconnected: {
      text: "Disconnected",
      color: "text-gray-600",
      icon: Circle,
      iconBg: "text-gray-500",
    },
    error: {
      text: "Error",
      color: "text-red-600",
      icon: AlertCircle,
      iconBg: "text-red-600",
    },
    offline: {
      text: "Offline",
      color: "text-orange-600",
      icon: WifiOff,
      iconBg: "text-orange-600",
    },
    syncing: {
      text: pendingOps ? `Syncing (${pendingOps})...` : "Syncing...",
      color: "text-blue-600",
      icon: Loader2,
      iconBg: "text-blue-600",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  const isSpinner = status === "connecting" || status === "syncing";

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${config.color}`}>
      {isSpinner ? (
        <Icon className={`h-4 w-4 flex-shrink-0 animate-spin ${config.iconBg}`} aria-hidden />
      ) : (
        <Icon className={`h-4 w-4 flex-shrink-0 ${config.iconBg}`} aria-hidden />
      )}
      <span>{config.text}</span>
    </div>
  );
}

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error";

interface ConnectionStatusProps {
  status: ConnectionStatus;
}

export default function ConnectionStatus({ status }: ConnectionStatusProps) {
  const statusConfig = {
    connected: { text: "Connected", color: "text-green-600" },
    connecting: { text: "Connecting...", color: "text-yellow-600" },
    disconnected: { text: "Disconnected", color: "text-gray-600" },
    error: { text: "Error", color: "text-red-600" },
  };

  const config = statusConfig[status];

  return (
    <div className={`text-sm font-medium ${config.color}`}>
      {config.text}
    </div>
  );
}

// src/components/utils/ConnectionStatus.tsx
"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import {
  crewAISocketManager,
  ConnectionStatus as ConnectionStatusType,
} from "@/lib/utils/crewAiWebSocketService";

interface ConnectionStatusProps {
  onStatusChange?: (status: ConnectionStatusType) => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  onStatusChange,
}) => {
  const [status, setStatus] = useState<ConnectionStatusType>("disconnected");
  const [message, setMessage] = useState<string>("");
  const [showDetails, setShowDetails] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to connection status updates
    const unsubscribe = crewAISocketManager.onConnectionStatus(
      (newStatus, msg) => {
        setStatus(newStatus);
        setMessage(msg);

        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      }
    );

    // Initial connection if needed
    if (crewAISocketManager.getConnectionStatus() === "disconnected") {
      crewAISocketManager.getSocket();
    }

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [onStatusChange]);

  const handleReconnect = () => {
    crewAISocketManager.getSocket();
  };

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return <CheckCircle size={18} className="text-green-500" />;
      case "disconnected":
        return <XCircle size={18} className="text-red-500" />;
      case "connecting":
        return <RefreshCw size={18} className="text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle size={18} className="text-gray-500" />;
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800 border-green-300";
      case "disconnected":
        return "bg-red-100 text-red-800 border-red-300";
      case "connecting":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <div
      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm border ${getStatusClass()}`}
      onClick={() => setShowDetails(!showDetails)}
    >
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="font-medium">{message}</span>
      </div>

      {status === "disconnected" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReconnect();
          }}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Reconnect
        </button>
      )}

      {showDetails && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white text-gray-800 border border-gray-200 rounded-md shadow-md z-10">
          <h4 className="font-medium mb-1">Connection Details</h4>
          <p className="text-xs mb-2">
            Status: <span className="font-medium">{status}</span>
          </p>
          <p className="text-xs">{message}</p>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;

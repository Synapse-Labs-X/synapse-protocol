import React from "react";
import { Wallet, Shield, Info } from "lucide-react";

interface WalletStatusIndicatorProps {
  initializedCount: number;
  totalCount: number;
  hasFailures: boolean;
  onClick?: () => void;
}

const WalletStatusIndicator: React.FC<WalletStatusIndicatorProps> = ({
  initializedCount,
  totalCount,
  hasFailures,
  onClick,
}) => {
  // Calculate percentage of initialized wallets
  const percentage = Math.round((initializedCount / totalCount) * 100);

  // Determine status color and icon
  let statusColor = "text-blue-400";
  let bgColor = "bg-blue-900/20 border-blue-800/30";
  let icon = <Wallet size={14} />;

  if (initializedCount === totalCount) {
    statusColor = "text-green-400";
    bgColor = "bg-green-900/20 border-green-800/30";
    icon = <Shield size={14} />;
  } else if (hasFailures) {
    statusColor = "text-yellow-400";
    bgColor = "bg-yellow-900/20 border-yellow-800/30";
    icon = <Info size={14} />;
  }

  return (
    <button
      onClick={onClick}
      className={`flex h-full items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${statusColor} ${bgColor} border backdrop-blur-sm transition-colors hover:bg-opacity-80`}
    >
      <span className="flex items-center">{icon}</span>
      <span>
        {initializedCount === totalCount
          ? "Wallets Ready"
          : `${initializedCount}/${totalCount}`}
      </span>

      {initializedCount < totalCount && (
        <span className="ml-1 inline-block w-8 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <span
            className="h-full bg-current rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          ></span>
        </span>
      )}
    </button>
  );
};

export default WalletStatusIndicator;

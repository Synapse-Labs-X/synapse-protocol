import React from "react";
import { Database, Server, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

interface InfoBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
  compact?: boolean;
}

const InfoBox: React.FC<InfoBoxProps> = ({
  icon,
  label,
  value,
  valueClassName = "text-white",
  compact = false,
}) => {
  return (
    <div
      className={`
      bg-gray-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center 
      border border-gray-700/50 hover:border-gray-600/70 transition-all duration-200 group
      ${compact ? "gap-1" : "gap-2"}
    `}
    >
      <div className="text-opacity-80 group-hover:text-opacity-100 transition-all">
        {icon}
      </div>
      <div>
        <span
          className={`text-gray-400 block leading-tight ${
            compact ? "text-2xs" : "text-xs"
          }`}
        >
          {label}
        </span>
        <div
          className={`font-medium ${
            compact ? "text-xs" : "text-sm"
          } ${valueClassName}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

interface NavbarInfoBoxesProps {
  balance: number;
  network: string;
  transactionCount: number;
  compact?: boolean;
}

const NavbarInfoBoxes: React.FC<NavbarInfoBoxesProps> = ({
  balance,
  network,
  transactionCount,
  compact,
}) => {
  const isMobile = useIsMobile();

  // Use compact mode on mobile or when explicitly requested
  const useCompact = compact || isMobile;

  // Icon size based on compact mode
  const iconSize = useCompact ? 12 : 14;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <InfoBox
        icon={<Database size={iconSize} className="text-green-400" />}
        label="Balance"
        value={formatCurrency(balance)}
        valueClassName="text-white font-mono"
        compact={useCompact}
      />

      {/* On very small screens, Network can be optional */}
      {(!isMobile || window.innerWidth > 360) && (
        <InfoBox
          icon={<Server size={iconSize} className="text-blue-400" />}
          label="Network"
          value={network}
          valueClassName="text-green-400"
          compact={useCompact}
        />
      )}

      <InfoBox
        icon={<FileText size={iconSize} className="text-purple-400" />}
        label="Transactions"
        value={transactionCount}
        compact={useCompact}
      />
    </div>
  );
};

export default NavbarInfoBoxes;

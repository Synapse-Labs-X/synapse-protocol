import React from "react";
import { Database, Server, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

interface InfoBoxProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClassName?: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({
  icon,
  label,
  value,
  valueClassName = "text-white",
}) => {
  return (
    <div className="bg-gray-800/80 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center border border-gray-700/50 hover:border-gray-600/70 transition-all duration-200 group">
      <div className="mr-2 text-opacity-80 group-hover:text-opacity-100 transition-all">
        {icon}
      </div>
      <div>
        <span className="text-gray-400 text-xs block leading-tight">
          {label}
        </span>
        <div className={`text-sm font-medium ${valueClassName}`}>{value}</div>
      </div>
    </div>
  );
};

interface NavbarInfoBoxesProps {
  balance: number;
  network: string;
  transactionCount: number;
}

const NavbarInfoBoxes: React.FC<NavbarInfoBoxesProps> = ({
  balance,
  network,
  transactionCount,
}) => {
  return (
    <div className="flex items-center gap-2">
      <InfoBox
        icon={<Database size={14} className="text-green-400" />}
        label="Balance"
        value={formatCurrency(balance)}
        valueClassName="text-white font-mono"
      />

      <InfoBox
        icon={<Server size={14} className="text-blue-400" />}
        label="Network"
        value={network}
        valueClassName="text-green-400"
      />

      <InfoBox
        icon={<FileText size={14} className="text-purple-400" />}
        label="Transactions"
        value={transactionCount}
      />
    </div>
  );
};

export default NavbarInfoBoxes;

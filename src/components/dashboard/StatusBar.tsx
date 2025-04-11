import React from "react";
import { Zap, Database, FileText, Server } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

interface StatusBarProps {
  balance: number;
  network: string;
  transactionCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({
  balance,
  network,
  transactionCount,
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center">
        <Zap size={24} className="text-yellow-400 mr-2" />
        <h1 className="text-xl font-bold">Synapse</h1>
        <span className="ml-2 text-gray-400 hidden sm:inline">
          Decentralized Agent Payment Protocol
        </span>
      </div>

      <div className="flex items-center space-x-2 md:space-x-4">
        <div className="bg-gray-700 px-3 py-2 rounded-lg flex items-center">
          <Database size={16} className="text-green-400 mr-2" />
          <div>
            <span className="text-gray-400 text-xs">Balance</span>
            <div className="font-mono text-sm">{formatCurrency(balance)}</div>
          </div>
        </div>

        <div className="bg-gray-700 px-3 py-2 rounded-lg flex items-center">
          <Server size={16} className="text-blue-400 mr-2" />
          <div>
            <span className="text-gray-400 text-xs">Network</span>
            <div className="text-green-400 text-sm">{network}</div>
          </div>
        </div>

        <div className="bg-gray-700 px-3 py-2 rounded-lg flex items-center">
          <FileText size={16} className="text-purple-400 mr-2" />
          <div>
            <span className="text-gray-400 text-xs">Transactions</span>
            <div className="text-sm">{transactionCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;

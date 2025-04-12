import React from "react";
import {
  Zap,
  Inbox,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Transaction } from "@/types/transaction";
import { Agent, AgentType } from "@/types/agent";
import { formatCurrency } from "@/lib/utils/formatters";

interface TransactionHistoryProps {
  transactions: Transaction[];
  agents: Agent[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  agents,
}) => {
  // Get agent color by type with more vibrant colors
  const getAgentColor = (type: AgentType): string => {
    const colors: Record<AgentType, string> = {
      main: "#FF6B6B",
      text: "#4ECDC4",
      image: "#00BFFF",
      data: "#FFF35C",
      assistant: "#9D5CFF",
    };
    return colors[type] || "#999";
  };

  // Format timestamp in a more readable way
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // For recent transactions (less than 24 hours), show relative time
    if (diffDays < 1) {
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Get agent name by ID
  const getAgentName = (agentId: string): string => {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.name || agentId;
  };

  // Get agent type by ID
  const getAgentType = (agentId: string): AgentType => {
    const agent = agents.find((a) => a.id === agentId);
    return agent?.type || "main";
  };

  // Get status icon based on transaction status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle size={14} className="text-green-400" />;
      case "pending":
        return <Clock size={14} className="text-yellow-400" />;
      case "failed":
        return <AlertCircle size={14} className="text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {transactions.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <Inbox size={32} className="mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400">No transactions yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Transactions will appear here once you start interacting with agents
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const fromType = getAgentType(tx.from);
            const toType = getAgentType(tx.to);
            const fromColor = getAgentColor(fromType);
            const toColor = getAgentColor(toType);

            return (
              <div
                key={tx.id}
                className="group relative bg-gray-800/40 backdrop-blur-sm hover:bg-gray-800/60 rounded-xl p-3 border border-gray-700/50 transition-all duration-300 hover:border-gray-600/70"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="bg-blue-900/50 backdrop-blur-sm p-2 rounded-full border border-blue-800/50 flex-shrink-0">
                      <Zap size={16} className="text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm flex flex-col xs:flex-row xs:items-center xs:flex-wrap gap-1 xs:gap-2">
                        <span className="flex items-center gap-1 flex-wrap">
                          <span
                            style={{ color: fromColor }}
                            className="font-medium truncate"
                          >
                            {getAgentName(tx.from)}
                          </span>

                          <ArrowRight
                            size={12}
                            className="text-gray-500 mx-0.5 flex-shrink-0"
                          />

                          <span
                            style={{ color: toColor }}
                            className="font-medium truncate"
                          >
                            {getAgentName(tx.to)}
                          </span>
                        </span>

                        <div className="flex-shrink-0">
                          {tx.status === "confirmed" ? (
                            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800/30">
                              {getStatusIcon(tx.status)}
                              <span>Confirmed</span>
                            </span>
                          ) : tx.status === "pending" ? (
                            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400 border border-yellow-800/30">
                              {getStatusIcon(tx.status)}
                              <span>Pending</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-800/30">
                              {getStatusIcon(tx.status)}
                              <span>Failed</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                        <span>{formatTime(tx.timestamp)}</span>
                        {tx.xrpTxHash && (
                          <a
                            href={`https://testnet.xrpl.org/transactions/${tx.xrpTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <ExternalLink size={10} className="mr-1" />
                            View on XRP Ledger
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="font-mono text-yellow-400 font-medium text-right sm:text-left">
                    {formatCurrency(tx.amount)}
                  </div>
                </div>

                {tx.memo && (
                  <div className="mt-2 text-xs text-gray-400 border-t border-gray-700/50 pt-2 transition-all duration-300 group-hover:border-gray-600/70">
                    <span className="font-medium">Memo:</span> {tx.memo}
                  </div>
                )}

                {/* Subtle glowing effect for recent transactions */}
                {new Date().getTime() - new Date(tx.timestamp).getTime() <
                  30000 && (
                  <div className="absolute inset-0 rounded-xl border border-blue-400/20 animate-pulse pointer-events-none"></div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;

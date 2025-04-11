import React from "react";
import { Zap, Inbox, ExternalLink } from "lucide-react";
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
  // Get agent color by type
  const getAgentColor = (type: AgentType): string => {
    const colors: Record<AgentType, string> = {
      main: "#FF6B6B",
      text: "#4ECDC4",
      image: "#1A535C",
      data: "#FFE66D",
      assistant: "#6B48FF",
    };
    return colors[type] || "#999";
  };

  // Format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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

  return (
    <div className="space-y-3">
      {transactions.length === 0 ? (
        <div className="text-center text-gray-500 py-6">
          <Inbox size={32} className="mx-auto mb-2" />
          <p>No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="bg-gray-800 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="bg-blue-900 p-2 rounded-full">
                    <Zap size={16} className="text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <div className="text-sm flex items-center space-x-2">
                      <span
                        style={{ color: getAgentColor(getAgentType(tx.from)) }}
                      >
                        {getAgentName(tx.from)}
                      </span>
                      <span className="text-gray-500 mx-1">→</span>
                      <span
                        style={{ color: getAgentColor(getAgentType(tx.to)) }}
                      >
                        {getAgentName(tx.to)}
                      </span>

                      {tx.status === "confirmed" ? (
                        <span className="bg-green-900 text-green-300 text-xs px-2 py-0.5 rounded-full">
                          Confirmed
                        </span>
                      ) : tx.status === "pending" ? (
                        <span className="bg-yellow-900 text-yellow-300 text-xs px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      ) : (
                        <span className="bg-red-900 text-red-300 text-xs px-2 py-0.5 rounded-full">
                          Failed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center">
                      {formatTime(tx.timestamp)}
                      {tx.xrpTxHash && (
                        <a
                          href={`https://testnet.xrpl.org/transactions/${tx.xrpTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 flex items-center text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink size={12} className="mr-1" />
                          View on XRP Ledger
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-yellow-400">
                  {formatCurrency(tx.amount)}
                </div>
              </div>

              {tx.memo && (
                <div className="mt-2 text-xs text-gray-400 border-t border-gray-700 pt-2">
                  <span className="font-medium">Memo:</span> {tx.memo}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;

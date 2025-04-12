"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Database, FileText, Server, X, Shield, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import StatusBarMenu from "../layout/StatusBarMenu";
import UserWalletButton from "../wallet/UserWalletButton";
import WalletStatusIndicator from "../wallet/WalletStatusIndicator";
import { Agent } from "@/types/agent";
import { createPortal } from "react-dom";

interface StatusBarProps {
  balance: number;
  network: string;
  transactionCount: number;
  mainAgent?: Agent;
  agents?: Agent[];
  onTransactionComplete?: () => void;
  onBalanceUpdate?: (amount: number) => void;
  walletStatus?: {
    initialized: string[];
    pending: string[];
    failed: string[];
  };
}

const StatusBar: React.FC<StatusBarProps> = ({
  balance,
  network,
  transactionCount,
  mainAgent,
  agents = [],
  onTransactionComplete,
  onBalanceUpdate,
  walletStatus,
}) => {
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Handle balance update from UserWalletButton
  const handleBalanceUpdate = (amount: number) => {
    if (onBalanceUpdate) {
      onBalanceUpdate(amount);
    }
  };

  // Calculate wallet statistics for the indicator
  const initializedCount = walletStatus?.initialized.length || 0;
  const totalCount = agents.length;
  const hasFailures = (walletStatus?.failed.length || 0) > 0;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/90 backdrop-blur-md border-b border-gray-700/70">
      <div className="flex items-center">
        <div className="flex items-center mr-4">
          <Image
            src="/synapse-logo.png"
            alt="Synapse Logo"
            width={28}
            height={28}
            className="mr-2"
          />
          <h1 className="text-xl font-bold">Synapse</h1>
        </div>
        <span className="text-gray-400 hidden md:inline text-sm">
          Decentralized Agent Payment Protocol
        </span>
      </div>

      <div className="flex items-center gap-2">
        {walletStatus && (
          <WalletStatusIndicator
            initializedCount={initializedCount}
            totalCount={totalCount}
            hasFailures={hasFailures}
            onClick={() => setShowWalletModal(true)}
          />
        )}

        <div className="bg-gray-700/80 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center border border-gray-600/30">
          <Database size={14} className="text-green-400 mr-2" />
          <div>
            <span className="text-gray-400 text-xs">Balance</span>
            <div className="font-mono text-sm">{formatCurrency(balance)}</div>
          </div>
        </div>

        <div className="bg-gray-700/80 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center border border-gray-600/30">
          <Server size={14} className="text-blue-400 mr-2" />
          <div>
            <span className="text-gray-400 text-xs">Network</span>
            <div className="text-green-400 text-sm">{network}</div>
          </div>
        </div>

        <div className="bg-gray-700/80 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center border border-gray-600/30">
          <FileText size={14} className="text-purple-400 mr-2" />
          <div>
            <span className="text-gray-400 text-xs">Transactions</span>
            <div className="text-sm">{transactionCount}</div>
          </div>
        </div>

        {/* User Wallet Button - consolidated component */}
        <UserWalletButton
          onBalanceUpdate={handleBalanceUpdate}
          currentBalance={balance}
        />

        {mainAgent && agents.length > 0 && (
          <StatusBarMenu
            mainAgent={mainAgent}
            targetAgents={agents.filter((a) => a.id !== mainAgent.id)}
            onTransactionComplete={onTransactionComplete}
          />
        )}
      </div>

      {/* Wallet Status Modal - Fixed positioning with portal rendering */}
      {showWalletModal &&
        walletStatus &&
        createPortal(
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-700 max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Wallet Status</h3>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Initialization Progress</span>
                  <span className="text-blue-400">
                    {Math.round((initializedCount / totalCount) * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${(initializedCount / totalCount) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Initialized wallets */}
                {walletStatus.initialized.length > 0 && (
                  <div>
                    <h4 className="text-green-400 flex items-center text-sm font-medium mb-2">
                      <Shield size={14} className="mr-1" /> Initialized Wallets
                    </h4>
                    <div className="bg-gray-700/80 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="space-y-1">
                        {walletStatus.initialized.map((id) => {
                          const agent = agents.find((a) => a.id === id);
                          return (
                            <div
                              key={id}
                              className="text-sm flex justify-between"
                            >
                              <span>{agent?.name || id}</span>
                              <span className="text-green-400 text-xs">
                                Ready
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending wallets */}
                {walletStatus.pending.length > 0 && (
                  <div>
                    <h4 className="text-blue-400 flex items-center text-sm font-medium mb-2">
                      <Wallet size={14} className="mr-1" /> Pending Wallets
                    </h4>
                    <div className="bg-gray-700/80 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="space-y-1">
                        {walletStatus.pending.map((id) => {
                          const agent = agents.find((a) => a.id === id);
                          return (
                            <div
                              key={id}
                              className="text-sm flex justify-between"
                            >
                              <span>{agent?.name || id}</span>
                              <span className="text-blue-400 text-xs">
                                Initializing...
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Failed wallets */}
                {walletStatus.failed.length > 0 && (
                  <div>
                    <h4 className="text-red-400 flex items-center text-sm font-medium mb-2">
                      <X size={14} className="mr-1" /> Failed Wallets
                    </h4>
                    <div className="bg-gray-700/80 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="space-y-1">
                        {walletStatus.failed.map((id) => {
                          const agent = agents.find((a) => a.id === id);
                          return (
                            <div
                              key={id}
                              className="text-sm flex justify-between"
                            >
                              <span>{agent?.name || id}</span>
                              <span className="text-red-400 text-xs">
                                Failed
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-400">
                      <p>
                        Some wallets failed to initialize. These agents may have
                        limited functionality.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default StatusBar;

"use client";

import React from "react";
import { Wallet, ShieldCheck, AlertCircle, CheckCircle } from "lucide-react";

interface WalletInitializationProps {
  initialized: string[];
  pending: string[];
  failed: string[];
  progress: number;
  agentNames: Record<string, string>;
}

const WalletInitialization: React.FC<WalletInitializationProps> = ({
  initialized,
  pending,
  failed,
  progress,
  agentNames,
}) => {
  return (
    <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-md flex items-center justify-center z-50">
      <div className="w-full max-w-md p-6 bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center mr-4">
            <Wallet size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Initializing Wallets
            </h2>
            <p className="text-gray-400 text-sm">
              Pre-authorizing agent wallets for faster transactions
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Initialization Progress</span>
            <span className="text-blue-400 font-medium">{progress}%</span>
          </div>
          <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Agent initialization status */}
        <div className="mt-4 bg-gray-900/50 rounded-lg p-4 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <ShieldCheck size={14} className="text-blue-400 mr-2" />
            Agent Wallet Status
          </h3>

          <div className="space-y-2">
            {/* Initialized wallets */}
            {initialized.map((agentId) => (
              <div
                key={`init-${agentId}`}
                className="flex items-center p-2 rounded-lg bg-gray-800/50 border border-green-900/30"
              >
                <CheckCircle size={16} className="text-green-500 mr-2" />
                <span className="text-sm">
                  {agentNames[agentId] || agentId}
                </span>
              </div>
            ))}

            {/* Pending wallets */}
            {pending.map((agentId) => (
              <div
                key={`pending-${agentId}`}
                className="flex items-center p-2 rounded-lg bg-gray-800/50 border border-blue-900/30"
              >
                <div className="w-4 h-4 mr-2 relative flex items-center justify-center">
                  <div className="absolute w-full h-full border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <span className="text-sm">
                  {agentNames[agentId] || agentId}
                </span>
              </div>
            ))}

            {/* Failed wallets */}
            {failed.map((agentId) => (
              <div
                key={`failed-${agentId}`}
                className="flex items-center p-2 rounded-lg bg-gray-800/50 border border-red-900/30"
              >
                <AlertCircle size={16} className="text-red-500 mr-2" />
                <span className="text-sm">
                  {agentNames[agentId] || agentId}
                </span>
                <span className="text-xs text-red-400 ml-auto">Failed</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress messages */}
        <div className="mt-4 text-center text-sm text-gray-400">
          {progress < 25 && (
            <p>Connecting to XRP Testnet and preparing agent wallets...</p>
          )}
          {progress >= 25 && progress < 75 && (
            <p>Initializing wallets and setting up agent connections...</p>
          )}
          {progress >= 75 && progress < 100 && (
            <p>Finalizing wallet setup and verifying connections...</p>
          )}
          {progress === 100 && (
            <p className="text-green-400">
              All wallets initialized! Preparing dashboard...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletInitialization;

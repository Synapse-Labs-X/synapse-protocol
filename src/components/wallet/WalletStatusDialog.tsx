import React from "react";
import {
  X,
  Shield,
  Wallet,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Agent } from "@/types/agent";

interface WalletStatusDialogProps {
  onClose: () => void;
  walletStatus: {
    initialized: string[];
    pending: string[];
    failed: string[];
    cached?: string[];
  };
  agents: Agent[];
  refreshWallets?: () => void;
}

const WalletStatusDialog: React.FC<WalletStatusDialogProps> = ({
  onClose,
  walletStatus,
  agents,
  refreshWallets,
}) => {
  const initializedCount = walletStatus?.initialized.length || 0;
  const totalCount = agents.length;
  const percentage = Math.round((initializedCount / totalCount) * 100);

  const cachedCount = walletStatus?.cached?.length || 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-gray-800 rounded-xl max-w-md w-full mx-4 shadow-2xl border border-gray-700/70 overflow-hidden transition-all transform scale-100 opacity-100">
        {/* Header with gradient accent */}
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600"></div>
          <div className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Database size={20} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Wallet Status</h3>
                <p className="text-sm text-gray-400">
                  Agent wallet initialization
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-300 font-medium">
                  Wallet Initialization
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 rounded-full text-xs text-blue-300 font-medium">
                  {percentage}%
                </span>
              </div>
              {refreshWallets && (
                <button
                  onClick={refreshWallets}
                  className="p-1.5 rounded-md hover:bg-gray-700/70 text-gray-400 hover:text-blue-400 transition-colors"
                  title="Refresh wallets"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            <div className="h-2 w-full bg-gray-700/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>
                {initializedCount} of {totalCount} wallets ready
              </span>
              <span>
                {cachedCount > 0 ? `${cachedCount} loaded from cache` : ""}
              </span>
            </div>
          </div>

          {/* Wallet Groups */}
          <div className="space-y-4 mb-5">
            {/* Initialized wallets */}
            {walletStatus.initialized.length > 0 && (
              <div className="rounded-lg bg-gray-900/50 border border-gray-700/50 overflow-hidden">
                <div className="px-4 py-3 bg-green-900/20 border-b border-gray-700/30">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-green-400" />
                    <h4 className="text-sm font-medium text-green-300">
                      Initialized Wallets
                    </h4>
                    <span className="ml-auto bg-green-500/20 px-2 py-0.5 rounded-full text-xs text-green-300">
                      {walletStatus.initialized.length}
                    </span>
                  </div>
                </div>
                <div className="p-3 max-h-40 overflow-y-auto divide-y divide-gray-700/30">
                  {walletStatus.initialized.map((id) => {
                    const agent = agents.find((a) => a.id === id);
                    const isCached = walletStatus.cached?.includes(id);
                    return (
                      <div
                        key={id}
                        className="py-2 px-1 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle size={14} className="text-green-400" />
                          <span className="text-sm">{agent?.name || id}</span>
                        </div>
                        <div className="flex items-center">
                          {isCached && (
                            <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full mr-2">
                              Cached
                            </span>
                          )}
                          <span className="text-xs text-green-300">Ready</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending wallets */}
            {walletStatus.pending.length > 0 && (
              <div className="rounded-lg bg-gray-900/50 border border-gray-700/50 overflow-hidden">
                <div className="px-4 py-3 bg-blue-900/20 border-b border-gray-700/30">
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="text-blue-400" />
                    <h4 className="text-sm font-medium text-blue-300">
                      Pending Wallets
                    </h4>
                    <span className="ml-auto bg-blue-500/20 px-2 py-0.5 rounded-full text-xs text-blue-300">
                      {walletStatus.pending.length}
                    </span>
                  </div>
                </div>
                <div className="p-3 max-h-32 overflow-y-auto divide-y divide-gray-700/30">
                  {walletStatus.pending.map((id) => {
                    const agent = agents.find((a) => a.id === id);
                    return (
                      <div
                        key={id}
                        className="py-2 px-1 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                          <span className="text-sm">{agent?.name || id}</span>
                        </div>
                        <span className="text-xs text-blue-300">
                          Initializing...
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Failed wallets */}
            {walletStatus.failed.length > 0 && (
              <div className="rounded-lg bg-gray-900/50 border border-gray-700/50 overflow-hidden">
                <div className="px-4 py-3 bg-red-900/20 border-b border-gray-700/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-400" />
                    <h4 className="text-sm font-medium text-red-300">
                      Failed Wallets
                    </h4>
                    <span className="ml-auto bg-red-500/20 px-2 py-0.5 rounded-full text-xs text-red-300">
                      {walletStatus.failed.length}
                    </span>
                  </div>
                </div>
                <div className="p-3 max-h-32 overflow-y-auto divide-y divide-gray-700/30">
                  {walletStatus.failed.map((id) => {
                    const agent = agents.find((a) => a.id === id);
                    return (
                      <div
                        key={id}
                        className="py-2 px-1 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle size={14} className="text-red-400" />
                          <span className="text-sm">{agent?.name || id}</span>
                        </div>
                        <span className="text-xs text-red-300">Failed</span>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-3 bg-red-900/10 border-t border-gray-700/30">
                  <p className="text-xs text-gray-400">
                    Some wallets failed to initialize. These agents may have
                    limited functionality.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Close
            </button>
            {refreshWallets && (
              <button
                onClick={refreshWallets}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Retry Failed
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletStatusDialog;

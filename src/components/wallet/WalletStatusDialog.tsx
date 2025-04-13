import React, { useState } from "react";
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

  const [exitAnimation, setExitAnimation] = useState(false);

  const handleClose = () => {
    setExitAnimation(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Enhanced animated backdrop with blur effect */}
      <div
        className={`fixed inset-0 bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-md transition-all duration-300 ${
          exitAnimation ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      >
        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        {/* Glow effects */}
        <div className="absolute left-1/4 top-1/3 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute right-1/3 bottom-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* Main dialog container with animation */}
      <div
        className={`relative max-w-md w-full mx-4 transition-all duration-300 ${
          exitAnimation
            ? "opacity-0 scale-95 translate-y-4"
            : "opacity-100 scale-100 translate-y-0"
        }`}
      >
        {/* Glow effect for the card */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 rounded-2xl blur-xl opacity-70"></div>

        <div className="relative bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-700/70 shadow-2xl overflow-hidden">
          {/* Animated top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500"></div>

          {/* Header with glass morphism */}
          <div className="p-5 flex justify-between items-center bg-gray-800/50 border-b border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-70 duration-1000 group-hover:opacity-100"></div>
                <Database size={20} className="text-blue-400 relative z-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Wallet Status</h3>
                <p className="text-sm text-gray-400">
                  Agent wallet initialization
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gray-600/0 group-hover:bg-gray-600/30 rounded-full transition-all duration-200"></div>
              <X size={20} className="relative z-10" />
            </button>
          </div>

          <div className="px-5 py-4">
            {/* Progress Bar with animation */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 font-medium">
                    Wallet Initialization
                  </span>
                  <span className="px-2 py-0.5 bg-blue-500/20 rounded-full text-xs text-blue-300 font-medium backdrop-blur-sm border border-blue-500/10">
                    {percentage}%
                  </span>
                </div>
                {refreshWallets && (
                  <button
                    onClick={refreshWallets}
                    className="p-1.5 rounded-md hover:bg-gray-700/70 text-gray-400 hover:text-blue-400 transition-colors group"
                    title="Refresh wallets"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute inset-0 bg-blue-500/10 rounded-md blur-md"></div>
                    </div>
                    <RefreshCw
                      size={14}
                      className="relative z-10 group-hover:rotate-180 transition-transform duration-500"
                    />
                  </button>
                )}
              </div>
              <div className="h-2 w-full bg-gray-700/70 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-1000 ease-out"
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

            {/* Wallet Groups with improved visuals */}
            <div className="space-y-4 mb-5">
              {/* Initialized wallets */}
              {walletStatus.initialized.length > 0 && (
                <div className="rounded-xl bg-gray-900/50 border border-gray-700/50 overflow-hidden shadow-inner hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-shadow duration-300">
                  <div className="px-4 py-3 bg-green-900/20 border-b border-gray-700/30 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-green-400" />
                      <h4 className="text-sm font-medium text-green-300">
                        Initialized Wallets
                      </h4>
                      <span className="ml-auto bg-green-500/20 px-2 py-0.5 rounded-full text-xs text-green-300 border border-green-500/20">
                        {walletStatus.initialized.length}
                      </span>
                    </div>
                  </div>
                  <div className="p-3 max-h-40 overflow-y-auto divide-y divide-gray-700/30 scrollbar-thin scrollbar-track-gray-800/20 scrollbar-thumb-gray-600/30">
                    {walletStatus.initialized.map((id) => {
                      const agent = agents.find((a) => a.id === id);
                      const isCached = walletStatus.cached?.includes(id);
                      return (
                        <div
                          key={id}
                          className="py-2 px-1 flex items-center justify-between transition-colors hover:bg-gray-800/30"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-400" />
                            <span className="text-sm">{agent?.name || id}</span>
                          </div>
                          <div className="flex items-center">
                            {isCached && (
                              <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full mr-2 border border-blue-500/20 backdrop-blur-sm">
                                Cached
                              </span>
                            )}
                            <span className="text-xs text-green-300 flex items-center gap-1">
                              <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
                              Ready
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pending wallets */}
              {walletStatus.pending.length > 0 && (
                <div className="rounded-xl bg-gray-900/50 border border-gray-700/50 overflow-hidden shadow-inner hover:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-shadow duration-300">
                  <div className="px-4 py-3 bg-blue-900/20 border-b border-gray-700/30 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className="text-blue-400" />
                      <h4 className="text-sm font-medium text-blue-300">
                        Pending Wallets
                      </h4>
                      <span className="ml-auto bg-blue-500/20 px-2 py-0.5 rounded-full text-xs text-blue-300 border border-blue-500/20">
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
                          className="py-2 px-1 flex items-center justify-between transition-colors hover:bg-gray-800/30"
                        >
                          <div className="flex items-center gap-2">
                            <div className="relative h-4 w-4 mr-1">
                              <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                              <div className="absolute inset-0 border-2 border-blue-300/20 rounded-full"></div>
                            </div>
                            <span className="text-sm">{agent?.name || id}</span>
                          </div>
                          <span className="text-xs text-blue-300 animate-pulse">
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
                <div className="rounded-xl bg-gray-900/50 border border-gray-700/50 overflow-hidden shadow-inner hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] transition-shadow duration-300">
                  <div className="px-4 py-3 bg-red-900/20 border-b border-gray-700/30 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-400" />
                      <h4 className="text-sm font-medium text-red-300">
                        Failed Wallets
                      </h4>
                      <span className="ml-auto bg-red-500/20 px-2 py-0.5 rounded-full text-xs text-red-300 border border-red-500/20">
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
                          className="py-2 px-1 flex items-center justify-between transition-colors hover:bg-gray-800/30"
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

            {/* Action buttons with enhanced styling */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden group shadow-md hover:shadow-lg"
              >
                <span className="relative z-10">Close</span>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600/0 via-gray-600/30 to-gray-600/0 animate-shimmer"></div>
                </div>
              </button>
              {refreshWallets && (
                <button
                  onClick={refreshWallets}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden group shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <RefreshCw
                      size={14}
                      className="group-hover:rotate-180 transition-transform duration-500"
                    />
                    Retry Failed
                  </span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-500/40 to-blue-600/0 animate-shimmer"></div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom keyframe animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default WalletStatusDialog;

import React from "react";
import { Zap } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <Zap size={36} className="text-yellow-400 mr-3" />
          <h1 className="text-3xl font-bold text-white">Synapse</h1>
        </div>

        <div className="relative h-24 w-24 mx-auto mb-8">
          {/* Main spinner */}
          <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>

          {/* Secondary spinner (slower, opposite direction) */}
          <div className="absolute inset-2 border-4 border-yellow-400 border-b-transparent rounded-full animate-spin animation-delay-500 animate-[spin_2s_linear_infinite_reverse]"></div>

          {/* Central circle */}
          <div className="absolute inset-5 rounded-full bg-gray-800 flex items-center justify-center">
            <Zap size={16} className="text-yellow-400" />
          </div>
        </div>

        <p className="text-xl text-white font-medium mb-2">Loading Dashboard</p>
        <p className="text-gray-400 max-w-md mx-auto">
          Initializing agent network and connecting to XRP Testnet...
        </p>

        {/* Loading steps */}
        <div className="mt-8 flex flex-col gap-2 items-center">
          <div className="flex items-center text-green-400">
            <span className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center text-xs text-black mr-2">
              ✓
            </span>
            <span className="text-sm">Initializing agent wallets</span>
          </div>

          <div className="flex items-center text-green-400">
            <span className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center text-xs text-black mr-2">
              ✓
            </span>
            <span className="text-sm">Setting up network connections</span>
          </div>

          <div className="flex items-center">
            <span className="w-5 h-5 rounded-full border border-gray-500 flex items-center justify-center mr-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </span>
            <span className="text-sm text-gray-300">
              Connecting to XRP Testnet
            </span>
          </div>
        </div>
      </div>

      {/* Footer with version info */}
      <div className="fixed bottom-4 text-center w-full">
        <p className="text-gray-500 text-xs">Synapse Protocol Demo v0.1.0</p>
      </div>
    </div>
  );
}

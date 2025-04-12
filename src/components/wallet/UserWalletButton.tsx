"use client";

import React, { useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import walletService from "@/lib/wallet/walletService";
import UserWalletModal from "./UserWalletModal";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

interface UserWalletButtonProps {
  onBalanceUpdate: (amount: number) => void;
  currentBalance: number;
}

const UserWalletButton: React.FC<UserWalletButtonProps> = ({
  onBalanceUpdate,
  currentBalance,
}) => {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isCrossmarkInstalled, setIsCrossmarkInstalled] = useState<
    boolean | null
  >(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    console.log(isMobile);
    if (isMobile) return;
    const checkWallet = async () => {
      await walletService.initialize();
      setIsCrossmarkInstalled(walletService.isCrossmarkInstalled());
      setIsWalletConnected(await walletService.isWalletConnected());
    };
    checkWallet();
  }, []);

  const handleOpenModal = async () => {
    if (isCrossmarkInstalled && !isWalletConnected) {
      setIsLoading(true);
      try {
        const connected = await walletService.connectWallet();
        if (connected) {
          setIsWalletConnected(true);
        }
      } catch (error) {
        console.error("Failed to connect wallet:", error);
      } finally {
        setIsLoading(false);
      }
    }
    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={isLoading}
        className="group h-full px-4 pt-0.5 pb-1 rounded-lg bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 shadow-[inset_0_1px_0_0_rgba(148,163,184,0.1)] backdrop-blur-sm transition-all duration-200 hover:bg-blue-800/40 hover:border-blue-600/50 flex items-center gap-3 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <Wallet
          size={16}
          className="text-blue-300 group-hover:text-blue-200 transition-colors"
        />
        <div className="text-left">
          <span className="text-xs font-medium text-blue-300/80 group-hover:text-blue-200/80 transition-colors">
            XRP WALLET
          </span>
          <div className="text-xs font-medium text-white flex items-center gap-1.5">
            {isCrossmarkInstalled === false ? (
              <span className="text-amber-400">Install Wallet</span>
            ) : isWalletConnected ? (
              <>
                <span className="text-green-300">Connected</span>
                <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></div>
              </>
            ) : isLoading ? (
              <span className="text-gray-300 flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse [animation-delay:-0.3s]"></span>
                <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse [animation-delay:-0.15s]"></span>
                <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse"></span>
              </span>
            ) : (
              <span className="text-blue-200 group-hover:text-white transition-colors">
                Connect
              </span>
            )}
          </div>
        </div>
      </button>

      {showModal && (
        <UserWalletModal
          isOpen={showModal}
          onModalClose={() => setShowModal(false)}
          onBalanceUpdate={onBalanceUpdate}
          currentBalance={currentBalance}
          onConnectionChange={(connected) => setIsWalletConnected(connected)}
        />
      )}
    </>
  );
};

export default UserWalletButton;

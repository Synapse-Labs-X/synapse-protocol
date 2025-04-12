"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import StatusBarMenu from "../layout/StatusBarMenu";
import UserWalletButton from "../wallet/UserWalletButton";
import WalletStatusIndicator from "../wallet/WalletStatusIndicator";
import NavbarInfoBoxes from "@/components/layout/InfoBox";
import WalletStatusDialog from "@/components/wallet/WalletStatusDialog";
import { Agent } from "@/types/agent";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

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
    cached?: string[];
  };
  hideCrossmark?: boolean;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hideCrossmark = false,
}) => {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();

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

  // Close mobile menu when resizing to desktop
  useEffect(() => {
    if (!isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile]);

  return (
    <div className="relative w-full bg-gray-800/90 backdrop-blur-md border-b border-gray-700/70">
      {/* Main StatusBar */}
      <div className="flex items-center justify-between p-3">
        {/* Logo and Brand - Always visible */}
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

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
            aria-label={showMobileMenu ? "Close menu" : "Open menu"}
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Desktop Items - Hidden on Mobile */}
        <div className="hidden md:flex items-center gap-2">
          {walletStatus && (
            <WalletStatusIndicator
              initializedCount={initializedCount}
              totalCount={totalCount}
              hasFailures={hasFailures}
              onClick={() => setShowWalletModal(true)}
            />
          )}

          {/* Use the improved NavbarInfoBoxes component */}
          <NavbarInfoBoxes
            balance={balance}
            network={network}
            transactionCount={transactionCount}
          />

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
      </div>

      {/* Mobile Menu - Expandable */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          showMobileMenu ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="p-4 space-y-4 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700/50">
          {/* Network Info */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <NavbarInfoBoxes
              balance={balance}
              network={network}
              transactionCount={transactionCount}
            />
          </div>

          {/* Wallet Status */}
          {walletStatus && (
            <div
              className="w-full p-3 rounded-lg bg-gray-800/70 border border-gray-700/50 flex items-center justify-between"
              onClick={() => setShowWalletModal(true)}
            >
              <span className="text-sm">Wallet Status</span>
              <WalletStatusIndicator
                initializedCount={initializedCount}
                totalCount={totalCount}
                hasFailures={hasFailures}
                onClick={() => setShowWalletModal(true)}
              />
            </div>
          )}

          {/* Wallet and Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <UserWalletButton
                onBalanceUpdate={handleBalanceUpdate}
                currentBalance={balance}
              />
            </div>

            {mainAgent && agents.length > 0 && (
              <div className="flex-1">
                {/* Simplified status bar menu for mobile */}
                <button
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/80 hover:bg-blue-700/90 rounded-lg transition-colors border border-blue-500/30 backdrop-blur-sm text-white"
                  onClick={() => {
                    // Open wallet modal
                    setShowWalletModal(true);
                    // Optionally close the mobile menu
                    setShowMobileMenu(false);
                  }}
                >
                  <span className="text-sm">Agent Actions</span>
                  <ChevronDown size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Status Modal - Using the improved WalletStatusDialog */}
      {showWalletModal &&
        walletStatus &&
        typeof document !== "undefined" &&
        createPortal(
          <WalletStatusDialog
            onClose={() => setShowWalletModal(false)}
            walletStatus={{
              initialized: walletStatus.initialized,
              pending: walletStatus.pending,
              failed: walletStatus.failed,
              cached: walletStatus.cached || [],
            }}
            agents={agents}
          />,
          document.body
        )}
    </div>
  );
};

export default StatusBar;

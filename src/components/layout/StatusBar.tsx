"use client";

import React, { useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import StatusBarMenu from "../layout/StatusBarMenu";
import UserWalletButton from "../wallet/UserWalletButton";
import WalletStatusIndicator from "../wallet/WalletStatusIndicator";
import NavbarInfoBoxes from "@/components/layout/InfoBox";
import WalletStatusDialog from "@/components/wallet/WalletStatusDialog";
import { Agent } from "@/types/agent";

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
  hideCrossmark = false,
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
              cached: [], // Ideally, you'd pass cached info here
            }}
            agents={agents}
          />,
          document.body
        )}
    </div>
  );
};

export default StatusBar;

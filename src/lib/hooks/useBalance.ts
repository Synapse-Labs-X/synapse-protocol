// src/lib/hooks/useBalance.ts
import { useState, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import balanceService from '@/lib/balance/balanceService';

export function useBalance() {
    const [mainBalance, setMainBalance] = useState<number>(
        balanceService.getMainBalance()
    );
    const [agentBalances, setAgentBalances] = useState<Record<string, number>>(
        balanceService.getAllAgentBalances()
    );
    const [totalVolume, setTotalVolume] = useState<number>(
        balanceService.getTotalTransactionVolume()
    );

    // Initialize listeners when the hook mounts
    useEffect(() => {
        // Subscribe to balance updates
        const handleBalanceUpdate = () => {
            setMainBalance(balanceService.getMainBalance());
            setAgentBalances(balanceService.getAllAgentBalances());
            setTotalVolume(balanceService.getTotalTransactionVolume());
        };

        balanceService.subscribe(handleBalanceUpdate);

        return () => {
            balanceService.unsubscribe(handleBalanceUpdate);
        };
    }, []);

    /**
     * Updates the main balance, typically from a user deposit
     */
    const updateMainBalance = (amount: number) => {
        balanceService.updateMainBalance(amount);
        setMainBalance(balanceService.getMainBalance());
    };

    /**
 * Process a transaction between agents
 * - Main agent balance decreases when sending funds
 * - Other agent balances accumulate costs
 */
    const processTransaction = (transaction: Transaction) => {
        const { from, to, amount } = transaction;

        // Track total transaction volume
        balanceService.updateTotalVolume(amount);
        setTotalVolume(balanceService.getTotalTransactionVolume());

        // Special case: If this is a top-up from a wallet, add to main balance
        if (from === 'user-wallet' && to === 'main-agent') {
            balanceService.updateMainBalance(amount);
            setMainBalance(balanceService.getMainBalance());
            return;
        }

        // MAIN AGENT BEHAVIOR: Decrease balance when sending
        if (from === 'main-agent') {
            // Deduct from main agent when it's the sender
            balanceService.updateMainBalance(-amount);
            setMainBalance(balanceService.getMainBalance());
        }

        // OTHER AGENTS BEHAVIOR: Accumulate costs as balance
        if (to !== 'main-agent') {
            // For non-main agents, accumulate "costs" as their balance
            const currentBalance = balanceService.getAgentBalance(to) || 0;
            balanceService.updateAgentBalance(to, currentBalance + amount);
        }

        // Special case: If transferring between two non-main agents,
        // we don't deduct from the sending agent's balance (only accumulate for receiver)

        // Update the agentBalances state
        setAgentBalances(balanceService.getAllAgentBalances());
    };

    return {
        mainBalance,
        agentBalances,
        totalVolume,
        updateMainBalance,
        processTransaction,
    };
}

export default useBalance;
# Implementing Real XRP Ledger Transactions in Interflux

This guide explains how to integrate real XRP Ledger transactions into your Interflux demo application. The implementation uses the XRP Ledger Testnet for safe experimentation without using real funds.

## Setup Instructions

### 1. Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```
# XRP Ledger Testnet connection URL
NEXT_PUBLIC_XRP_TESTNET_URL="wss://s.altnet.rippletest.net:51233"

# Feature flags
NEXT_PUBLIC_USE_REAL_TRANSACTIONS="true"
NEXT_PUBLIC_USE_SIMULATION="false"

# For demonstration purposes only - never include wallet seeds in code or env files
# In a real application, these would be stored securely in a vault or HSM
# Replace with your own seeds generated from trustline.js script
MAIN_AGENT_SEED="your_seed_here"
```

### 2. Generate Wallets and Set Up Trustlines

Before using real transactions, you need to:

1. Generate a wallet for each agent
2. Fund the wallets with test XRP
3. Create trustlines for the RLUSD token

Run the provided scripts from the command line:

```bash
# Generate wallets and establish trustlines
node scripts/generate_and_trustline.js
```

Take note of the generated wallet addresses and seeds. Add these to your `.env.local` file or to the `agentWallets` object in `realTransactionService.ts`.

### 3. Configure Real Transaction Service

Update the `realTransactionService.ts` file with the wallet information you generated:

```typescript
// Update these with your generated wallet seeds
private agentWallets: Record<string, string> = {
  'main-agent': 'your_main_agent_seed',
  'text-gen-1': 'your_text_gen_seed',
  // Add all other agent seeds
};
```

### 4. Enable Real Transactions

To enable real transactions:

1. Set `NEXT_PUBLIC_USE_REAL_TRANSACTIONS="true"` in your `.env.local` file
2. Set `NEXT_PUBLIC_USE_SIMULATION="false"` in your `.env.local` file
3. Restart your Next.js development server

## Transaction Flow

1. **User Initiates Transaction**: The user opens the transaction modal by clicking the "Send RLUSD" button in the agent details or status bar menu.

2. **Transaction Parameters**: The user enters the amount and optional memo.

3. **Transaction Processing**:

   - The transaction request is sent to the `realTransactionService`
   - The service retrieves or generates XRP wallets for both the source and target agents
   - For RLUSD transactions, it creates a Payment transaction with the RLUSD currency code and issuer
   - The transaction is signed and submitted to the XRP Ledger Testnet

4. **Transaction Verification**: After submission, the transaction's success is verified and displayed to the user.

5. **Viewing Transactions**: Successful transactions can be viewed on the XRP Ledger Testnet Explorer by clicking the provided link.

## Trustline Management

Agents need to establish trustlines for RLUSD before they can receive the token. The Status Bar menu includes a "Create Trustlines" option that:

1. Lists all available agents
2. Allows setting up trustlines for each agent
3. Shows the status of trustline creation

## Security Considerations

In a production environment:

1. **Never store wallet seeds in code or environment files**
2. Use a secure HSM (Hardware Security Module) or vault service for wallet management
3. Implement proper authentication and authorization for transaction initiation
4. Monitor transactions for unusual patterns or amounts
5. Implement transaction rate limiting
6. Use secure error handling that doesn't expose sensitive information

## Troubleshooting

Common issues and solutions:

- **Transaction fails**: Ensure the source wallet has enough XRP for fees and the transaction amount
- **Trustline required**: Make sure the receiving agent has established a trustline for RLUSD
- **Network connection**: Check the connection to the XRP Ledger Testnet
- **Wallet not found**: Ensure wallet seeds are correctly configured in the service

## Further Development

Enhancement ideas:

1. **Transaction History**: Add a detailed transaction history view
2. **Multiple Currencies**: Support additional currencies beyond RLUSD
3. **Payment Channels**: Implement XRP payment channels for micro-transactions
4. **Multi-signature Transactions**: Add support for transactions requiring multiple approvals
5. **Escrow Payments**: Implement conditional payments using XRP's escrow feature
6. **Analytics Dashboard**: Add transaction analytics and visualization

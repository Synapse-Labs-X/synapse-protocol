// src/lib/xrp/walletKeyManager.ts
import { Wallet } from "xrpl";

/**
 * WalletKeyManager
 *
 * Manages wallet keys for agent accounts in a demonstration environment.
 * WARNING: In a production environment, never store private keys or seeds in code.
 * This is for DEMONSTRATION PURPOSES ONLY.
 */
class WalletKeyManager {
  private static instance: WalletKeyManager;

  // Demo wallet keys - NEVER use this approach in production
  private readonly demoWalletKeys: Record<
    string,
    {
      address: string;
      seed: string;
      publicKey: string;
      privateKey: string;
    }
  > = {
    "main-agent": {
      address: "rB62y9mPhRydhSSmZ89xdQX6aEoLj9sVR1",
      seed: "sEd7xpuxquNxvmwcutNd5fJjT2Cwk3b",
      publicKey:
        "ED489DE3DA626E51B787479AE5361595BBBDCB141A68A9D08BB505F3D6C47B6A95",
      privateKey:
        "ED516B4F7E6A5C9FB0C3FD76C988CD5339710E5277688BF7D03D79C657F26EEB41",
    },
    "text-gen-1": {
      address: "rKNuR1iWgmPvn4hpRNhxeMJTt2j93V2reb",
      seed: "sEdVjRrdxZUkzprQjBgtcuMEdYdmfR7",
      publicKey:
        "EDB8A46359C6A81505BC56450CE4554DE46D53F7E4783597E2DBB8DF4351AE7A9D",
      privateKey:
        "EDE8A2CF986553AE4CE400138B9004D3B5DA7CB28A134A0EA5C6002BEC54DEA15D",
    },
    "image-gen-1": {
      address: "re95mxh6xkSPPJnUWWvReTgnmDjPuv46T",
      seed: "sEdS8VsMF716x5SCQGkrdh8Yy2aj2Um",
      publicKey:
        "EDEAD1AE0403F60465AE87B3A7E5465CE093FC9480DD24B4E2A6CAB793E3E7CE3F",
      privateKey:
        "EDD40756D4343F676592B8D73FE2995C4D941E53D6B4018432F9DE5E98FA223637",
    },
    "data-analyzer": {
      address: "rUMLJqFfbKNksVAyPWBnvR5gC1492uKbLs",
      seed: "sEdSJ2BqCm1yPupJMtWQzXknT5GmUz9",
      publicKey:
        "ED6E6CCF63571F67C8568240A2D7ACC817B7E270742CC082B003E8791948B494CC",
      privateKey:
        "EDD95D0C086D1A8D9ABCBC790AC591432ED9087FCCD5FA7493F996BDD929BB9601",
    },
    "research-assistant": {
      address: "rUcFUV9NeujucT7ufMzSvVKcfJa1VdRvZp",
      seed: "sEdVVEB58YPB5XnVS47r9Y6fvTtQCBD",
      publicKey:
        "ED370DFCBD38660A18EE175175AF9A603662E01E42F7843D54EC2A77958E36A6F8",
      privateKey:
        "EDFC0A2C4DD5FDBE83713478B42CD2765BE99598E62F05EC9BD0B2AFCEF40B9E2E",
    },
    "code-generator": {
      address: "rfXgqbnwnepQJR6qb14cRvxTpphNAfe4ii",
      seed: "sEd7dfdzsnwjQyKonRTppDR4eJNCbr1",
      publicKey:
        "ED8ADD4718BAFB5064776B64F2B3B1D74E3CA4D1164F6228BC9FC7D138A10EB700",
      privateKey:
        "ED8F2C8C9C8B120892B7D92E501E94510B802C124F3E34297B4C285C5B84A8A389",
    },
    translator: {
      address: "rNYLmPv3mv2wK2MRAQ98KT8B8922EdvuzD",
      seed: "sEdTDsuxpCdSsTsLcg39abNSbFtwyhH",
      publicKey:
        "EDAB79466874C9B528C9C45A37A894E2D1EA05101ED961ED6C08E94A4985186D08",
      privateKey:
        "ED4B49B70BF9123DC80D6714E148168DDC4137498D72ECFD0D42488BCCCB65F01D",
    },
    summarizer: {
      address: "rf2ea7y1wP67z79RYjPGGWo64X3yhy2bYE",
      seed: "sEdVCUw1ugHX2skz73wbDZtfnrkQVkG",
      publicKey:
        "ED8ED2EA5C7F0946ED3BE6A3BD0A3874813A3B7D5A852992A85D676078359E19AC",
      privateKey:
        "EDDD94540EE212557FD3648B681840E7076106FE628337C12CAEF17201179880EA",
    },
    // Note: user-wallet is NOT included here as it's handled separately via the user's wallet
  };

  private constructor() {}

  public static getInstance(): WalletKeyManager {
    if (!WalletKeyManager.instance) {
      WalletKeyManager.instance = new WalletKeyManager();
    }
    return WalletKeyManager.instance;
  }

  /**
   * Get a wallet for an agent using the demo keys
   * @param agentId The agent ID to get the wallet for
   * @returns A wallet instance or null if not found
   */
  public getWallet(agentId: string): Wallet | null {
    const keyData = this.demoWalletKeys[agentId];

    if (!keyData) {
      return null;
    }

    try {
      // Create wallet from the seed
      return Wallet.fromSeed(keyData.seed);
    } catch (error) {
      console.error(`Failed to create wallet for agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Check if we have keys for a specific agent
   * @param agentId The agent ID to check
   * @returns True if keys exist, false otherwise
   */
  public hasKeys(agentId: string): boolean {
    return agentId in this.demoWalletKeys;
  }

  /**
   * Get the address for an agent
   * @param agentId The agent ID
   * @returns The address or null if not found
   */
  public getAddress(agentId: string): string | null {
    return this.demoWalletKeys[agentId]?.address || null;
  }

  /**
   * Get all agent IDs that have demo keys
   * @returns Array of agent IDs
   */
  public getAllAgentIds(): string[] {
    return Object.keys(this.demoWalletKeys);
  }
}

// Export a singleton instance
const walletKeyManager = WalletKeyManager.getInstance();
export default walletKeyManager;

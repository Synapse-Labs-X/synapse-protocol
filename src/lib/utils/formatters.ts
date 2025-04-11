/**
 * Formats a number as a currency string with the RLUSD symbol
 */
export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} RLUSD`;
}

/**
 * Formats a timestamp into a human-readable string
 */
export function formatTimestamp(
  timestamp: string,
  format: "short" | "long" = "short",
): string {
  const date = new Date(timestamp);

  if (format === "short") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Formats a wallet address to a shortened version
 */
export function formatWalletAddress(
  address: string,
  length: number = 4,
): string {
  if (!address || address.length < 10) return address;

  return `${address.substring(0, length)}...${address.substring(address.length - length)}`;
}

/**
 * Formats a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Formats a large number with comma separators
 */
export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Formats a transaction ID to a shorter, more readable version
 */
export function formatTransactionId(txId: string): string {
  if (!txId || txId.length < 16) return txId;

  // If it's a simulated transaction ID that follows our format
  if (txId.startsWith("tx-") || txId.startsWith("sim-tx-")) {
    const parts = txId.split("-");
    if (parts.length >= 3) {
      const timestamp = parseInt(parts[1]);
      const date = new Date(timestamp);
      return `TX-${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}-${parts[2].substring(0, 4)}`;
    }
  }

  // Otherwise, just truncate it
  return `${txId.substring(0, 8)}...`;
}

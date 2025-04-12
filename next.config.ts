import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  transpilePackages: ["react-force-graph-2d", "react-force-graph", "d3-force", "d3"],
  env: {
    NEXT_PUBLIC_XRP_TESTNET_URL: process.env.NEXT_PUBLIC_XRP_TESTNET_URL,
    NEXT_PUBLIC_MAIN_WALLET_ADDRESS:
      process.env.NEXT_PUBLIC_MAIN_WALLET_ADDRESS,
    NEXT_PUBLIC_USE_SIMULATION: process.env.NEXT_PUBLIC_USE_SIMULATION,
  }
};

export default nextConfig;
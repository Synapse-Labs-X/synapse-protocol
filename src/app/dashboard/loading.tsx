"use client";

import React from "react";
import Image from "next/image";

export default function Loading() {
  return (
    <main className="h-screen bg-gradient-futuristic flex flex-col items-center justify-center">
      <div className="relative">
        {/* Animated logo */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-6 mx-auto">
          <div className="absolute w-full h-full rounded-full bg-blue-600/30 animate-ping"></div>
          <div className="absolute w-16 h-16 rounded-full border-4 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin"></div>
          <div className="relative text-blue-400">
            <Image width={28} height={28} src="/synapse-logo.png" alt="Logo" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 via-white to-blue-400 bg-clip-text text-transparent">
          Synapse Protocol
        </h1>
        <p className="text-gray-400 text-center max-w-xs mx-auto">
          Decentralized Payment Network for Autonomous Agents
        </p>
      </div>

      {/* Loading steps with staggered animation */}
      <div className="mt-8 bg-gray-800/50 backdrop-blur-md rounded-lg border border-gray-700/50 p-4 w-full max-w-sm">
        <div className="space-y-3">
          <div
            className="flex items-center text-green-400 animate-fadeIn"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <span className="text-sm">Initializing agent network</span>
          </div>

          <div
            className="flex items-center text-green-400 animate-fadeIn"
            style={{ animationDelay: "0.7s" }}
          >
            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <span className="text-sm">Loading wallet integrations</span>
          </div>

          <div
            className="flex items-center text-white animate-fadeIn"
            style={{ animationDelay: "1.2s" }}
          >
            <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center mr-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <span className="text-sm">Connecting to XRP Testnet</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          opacity: 0;
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </main>
  );
}

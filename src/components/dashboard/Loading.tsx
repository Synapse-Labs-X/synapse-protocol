"use client";

import React, { useEffect, useState } from "react";
import { Zap, Server, Database } from "lucide-react";

const EnhancedLoading = () => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const loadingSteps = [
    "Initializing agent network",
    "Loading wallet integrations",
    "Connecting to XRP Testnet",
    "Preparing virtual environment",
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress < 100) {
        setProgress((prev) => {
          const increment = Math.floor(Math.random() * 10) + 1;
          const newProgress = Math.min(prev + increment, 100);

          // Update current step based on progress
          if (newProgress > 25 && currentStep < 1) setCurrentStep(1);
          if (newProgress > 50 && currentStep < 2) setCurrentStep(2);
          if (newProgress > 75 && currentStep < 3) setCurrentStep(3);

          return newProgress;
        });
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [progress, currentStep]);

  return (
    <div className="h-screen bg-gray-900 flex flex-col items-center justify-center">
      <div className="relative">
        {/* Logo animation with glow effect */}
        <div className="relative flex items-center justify-center w-24 h-24 mb-8 mx-auto">
          <div className="absolute w-full h-full rounded-full bg-blue-600/20 animate-ping"></div>
          <div className="absolute w-20 h-20 rounded-full border-4 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-blue-600/10 to-indigo-600/10 backdrop-blur-sm"></div>
          <div className="relative text-blue-400">
            <Zap size={36} />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-400 via-white to-blue-400 bg-clip-text text-transparent">
          Synapse Protocol
        </h1>
        <p className="text-gray-400 text-center max-w-xs mx-auto mb-8">
          Decentralized Payment Network for Autonomous Agents
        </p>
      </div>

      {/* Loading progress bar */}
      <div className="w-full max-w-md mx-auto px-6 mb-8">
        <div className="h-1 w-full bg-gray-800 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>Initializing...</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Loading steps with staggered animation */}
      <div className="bg-gray-800/50 backdrop-blur-md rounded-xl border border-gray-700/50 p-5 w-full max-w-md mx-6">
        <div className="space-y-4">
          {loadingSteps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center ${
                index <= currentStep ? "text-white" : "text-gray-500"
              } transition-all duration-500`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                  index < currentStep
                    ? "bg-green-500/20 text-green-400"
                    : index === currentStep
                    ? "bg-blue-500/20 text-blue-400 animate-pulse"
                    : "bg-gray-800/50 text-gray-600"
                }`}
              >
                {index < currentStep ? (
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
                ) : index === currentStep ? (
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <span className="text-sm font-medium">{step}</span>
                  {index === currentStep && (
                    <span className="ml-2 flex">
                      <span className="animate-pulse delay-0">.</span>
                      <span className="animate-pulse delay-150">.</span>
                      <span className="animate-pulse delay-300">.</span>
                    </span>
                  )}
                </div>
                {index === 0 && index <= currentStep && (
                  <div className="text-xs text-gray-500 mt-1">
                    Initialized 8 agents in the network
                  </div>
                )}
                {index === 1 && index <= currentStep && (
                  <div className="text-xs text-gray-500 mt-1">
                    RLUSD token integration complete
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Network info pills - shown when progress is almost complete */}
        <div
          className={`mt-6 grid grid-cols-2 gap-3 transition-all duration-700 ${
            progress > 75
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-lg p-3 flex items-center gap-2">
            <Server size={16} className="text-green-400" />
            <div className="text-xs">
              <div className="text-gray-400">Network</div>
              <div className="text-green-400 font-medium">XRP Testnet</div>
            </div>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-sm rounded-lg p-3 flex items-center gap-2">
            <Database size={16} className="text-blue-400" />
            <div className="text-xs">
              <div className="text-gray-400">Start Balance</div>
              <div className="font-medium">995.00 RLUSD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Version information */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 text-xs">Synapse Protocol v0.1.0</p>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .delay-0 {
          animation-delay: 0ms;
        }

        .delay-150 {
          animation-delay: 150ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
};

export default EnhancedLoading;

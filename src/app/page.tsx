"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

export default function Home() {
  const router = useRouter();

  // Redirect to dashboard on load
  useEffect(() => {
    router.push("/dashboard");
  }, [router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-futuristic text-white">
      <div className="w-full max-w-lg text-center">
        <div className="flex items-center justify-center mb-6">
          <Zap size={48} className="text-yellow-400 mr-2" />
          <h1 className="text-4xl font-bold">Synapse</h1>
        </div>
        <p className="text-xl text-gray-300 mb-8">
          Decentralized Payment Protocol for Autonomous AI Agents
        </p>
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        <p className="mt-6 text-gray-400">Loading dashboard...</p>
      </div>
    </main>
  );
}

// Update ClientSideOnly component with error boundary
"use client";

import React, { useState, useEffect, ReactNode } from "react";

interface ClientSideOnlyProps {
  children: ReactNode;
}

const ClientSideOnly: React.FC<ClientSideOnlyProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (error) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <h2 className="text-xl text-red-400 mb-4">
          Something went wrong rendering the dashboard
        </h2>
        <div className="bg-gray-800 p-4 rounded-lg max-w-2xl overflow-auto">
          <p className="text-red-300 mb-2">{error.message}</p>
          <pre className="text-xs text-gray-400">{error.stack}</pre>
        </div>
      </div>
    );
  }

  if (!isClient) {
    return null;
  }

  try {
    return <>{children}</>;
  } catch (e) {
    const error = e instanceof Error ? e : new Error("Unknown error occurred");
    setError(error);
    return null;
  }
};

export default ClientSideOnly;

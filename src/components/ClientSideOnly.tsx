"use client";

import React, { useState, useEffect, ReactNode } from "react";

interface ClientSideOnlyProps {
  children: ReactNode;
}

/**
 * Wrapper component that ensures children are only rendered on the client side
 */
const ClientSideOnly: React.FC<ClientSideOnlyProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <>{children}</>;
};

export default ClientSideOnly;

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from './WalletContext';

interface PointsContextType {
  globalPoints: number;
  setGlobalPoints: (points: number) => void;
}

const defaultContext: PointsContextType = {
  globalPoints: 0,
  setGlobalPoints: () => {}
};

const PointsContext = createContext<PointsContextType>(defaultContext);

export function usePoints() {
  return useContext(PointsContext);
}

interface PointsProviderProps {
  children: ReactNode;
}

export function PointsProvider({ children }: PointsProviderProps) {
  const [globalPoints, setGlobalPoints] = useState(0);
  const { walletData } = useWallet();
  
  // Sync points with wallet data when it changes
  useEffect(() => {
    if (walletData?.petStats?.points !== undefined) {
      setGlobalPoints(walletData.petStats.points);
    }
  }, [walletData]);
  
  const value = {
    globalPoints,
    setGlobalPoints
  };
  
  return (
    <PointsContext.Provider value={value}>
      {children}
    </PointsContext.Provider>
  );
} 
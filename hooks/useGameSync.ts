import { useState, useEffect, useCallback, useRef } from 'react';
import { gameSyncManager } from '../lib/game-sync-manager';
import { DataChangeEvent, GameSession } from '../lib/models';

interface UseGameSyncOptions {
  autoStart?: boolean;
  subscribeToPath?: string;
}

export function useGameSync<T = any>(options: UseGameSyncOptions = {}) {
  const [gameState, setGameState] = useState<T>({} as T);
  const [isActive, setIsActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pathRef = useRef<string | undefined>(options.subscribeToPath);
  
  // Handle changes to the game state
  const handleStateChange = useCallback((change: DataChangeEvent) => {
    if (change.operation === 'update') {
      // If we're subscribed to a specific path, filter by that path
      if (pathRef.current) {
        // If the change is for a parent path of our subscribed path
        if (change.entityId === 'game' || 
            pathRef.current.startsWith(change.entityId) || 
            (typeof change.data === 'object' && change.data !== null)) {
          
          // Get just our subscribed data from the game state
          const subscribedData = gameSyncManager.getGameStateValue(pathRef.current);
          setGameState(subscribedData === undefined ? {} as T : subscribedData as T);
        }
      } else {
        // Not subscribed to a specific path, use the full game state
        setGameState(gameSyncManager.getGameState() as T);
      }
    }
  }, []);
  
  // Start a new game session
  const startSession = useCallback(async (walletAddress: string): Promise<GameSession | null> => {
    try {
      setError(null);
      setIsSyncing(true);
      
      const session = await gameSyncManager.startSession(walletAddress);
      
      if (session) {
        setIsActive(true);
        setSessionId(session.sessionId);
        
        // Set initial game state
        if (pathRef.current) {
          const subscribedData = gameSyncManager.getGameStateValue(pathRef.current);
          setGameState(subscribedData === undefined ? {} as T : subscribedData as T);
        } else {
          setGameState(gameSyncManager.getGameState() as T);
        }
      }
      
      return session;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start game session';
      setError(errorMessage);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);
  
  // End the current session
  const endSession = useCallback(async (): Promise<boolean> => {
    try {
      setIsSyncing(true);
      const result = await gameSyncManager.endSession();
      
      if (result) {
        setIsActive(false);
        setSessionId(null);
        setGameState({} as T);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end game session';
      setError(errorMessage);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);
  
  // Update game state
  const updateState = useCallback((changes: Partial<T>, path?: string): void => {
    // If we're updating a subscribed path, construct the full path
    const fullPath = path 
      ? (pathRef.current ? `${pathRef.current}.${path}` : path) 
      : pathRef.current || '';
    
    gameSyncManager.updateGameState(changes, fullPath);
    
    // Update local state immediately for better UX
    setGameState(prevState => ({
      ...prevState,
      ...(changes as T),
    }));
  }, []);
  
  // Delete a property from the game state
  const deleteProperty = useCallback((propertyPath: string): void => {
    const fullPath = pathRef.current 
      ? `${pathRef.current}.${propertyPath}` 
      : propertyPath;
    
    gameSyncManager.deleteGameStateProperty(fullPath);
    
    // Update local state immediately for better UX
    if (pathRef.current) {
      // If we're subscribed to a specific path, get that updated path
      const subscribedData = gameSyncManager.getGameStateValue(pathRef.current);
      setGameState(subscribedData === undefined ? {} as T : subscribedData as T);
    } else {
      // Otherwise update the full game state
      setGameState(gameSyncManager.getGameState() as T);
    }
  }, []);
  
  // Force a sync with the server
  const forceSync = useCallback(async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      return await gameSyncManager.forceSync();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync game state';
      setError(errorMessage);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);
  
  // Get a specific value from the game state
  const getValue = useCallback((path: string): any => {
    const fullPath = pathRef.current ? `${pathRef.current}.${path}` : path;
    return gameSyncManager.getGameStateValue(fullPath);
  }, []);
  
  // Set up effect to subscribe to game state changes
  useEffect(() => {
    // Subscribe to game state changes
    if (!unsubscribeRef.current) {
      unsubscribeRef.current = gameSyncManager.addChangeListener(handleStateChange);
    }
    
    // Check if there's already an active session
    const hasSession = gameSyncManager.hasActiveSession();
    setIsActive(hasSession);
    
    if (hasSession) {
      setSessionId(gameSyncManager.getSessionId());
      
      // Set initial game state
      if (pathRef.current) {
        const subscribedData = gameSyncManager.getGameStateValue(pathRef.current);
        setGameState(subscribedData === undefined ? {} as T : subscribedData as T);
      } else {
        setGameState(gameSyncManager.getGameState() as T);
      }
    }
    
    // Update offline status
    setIsOffline(gameSyncManager.isOffline());
    
    return () => {
      // Unsubscribe when component unmounts
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [handleStateChange]);
  
  return {
    gameState,
    isActive,
    isSyncing,
    isOffline,
    sessionId,
    error,
    startSession,
    endSession,
    updateState,
    deleteProperty,
    forceSync,
    getValue
  };
} 
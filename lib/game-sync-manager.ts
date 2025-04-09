import { GameSession, DataChangeEvent } from './models';
import { dbService } from './database-service';

export const SYNC_INTERVAL_MS = 2000; // 2 seconds
export const MAX_QUEUE_SIZE = 100;
export type ConflictResolutionStrategy = 'client-wins' | 'server-wins' | 'merge';
export const CONFLICT_RESOLUTION_STRATEGY: ConflictResolutionStrategy = 'client-wins';

// Manages game state synchronization
export class GameSyncManager {
  private static _instance: GameSyncManager;
  private currentSession: GameSession | null = null;
  private gameStateQueue: DataChangeEvent[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private lastServerSync: number = 0;
  private offlineMode: boolean = false;
  private changeListeners: ((change: DataChangeEvent) => void)[] = [];
  
  private constructor() {
    // Initialize sync system
    this.setupNetworkDetection();
    
    // Start sync processing
    if (typeof window !== 'undefined') {
      this.startSyncInterval();
    }
  }
  
  public static get instance(): GameSyncManager {
    if (!GameSyncManager._instance) {
      GameSyncManager._instance = new GameSyncManager();
    }
    return GameSyncManager._instance;
  }
  
  // Set up network detection
  private setupNetworkDetection(): void {
    if (typeof window !== 'undefined') {
      // Listen for online/offline events
      window.addEventListener('online', () => {
        console.log('🌐 Network connection restored');
        this.offlineMode = false;
        this.processPendingSync();
      });
      
      window.addEventListener('offline', () => {
        console.log('⚠️ Network connection lost - switching to offline mode');
        this.offlineMode = true;
      });
      
      // Check initial state
      this.offlineMode = !navigator.onLine;
    }
  }
  
  // Start periodic sync
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.processPendingSync();
    }, SYNC_INTERVAL_MS);
  }
  
  // Stop sync interval
  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // Process pending sync operations
  private async processPendingSync(): Promise<void> {
    // Skip if offline or no session
    if (this.offlineMode || !this.currentSession) return;
    
    // Skip if no changes to sync
    if (this.gameStateQueue.length === 0) return;
    
    try {
      // Get current game session from server
      const serverSession = await dbService.getGameSession(this.currentSession.sessionId);
      
      // If session doesn't exist or is no longer active, create a new one
      if (!serverSession || !serverSession.isActive) {
        if (this.currentSession.walletAddress) {
          const newSessionId = await dbService.createGameSession(this.currentSession.walletAddress);
          if (newSessionId) {
            const newSession = await dbService.getGameSession(newSessionId);
            if (newSession) {
              this.currentSession = newSession;
            }
          }
        }
        return;
      }
      
      // Compare versions
      if (serverSession.version > this.currentSession.version) {
        // Server has newer data, handle conflict based on strategy
        if (CONFLICT_RESOLUTION_STRATEGY === 'server-wins') {
          // Use server data and discard local changes
          this.currentSession = serverSession;
          this.gameStateQueue = [];
          
          // Notify listeners of reset
          this.notifyChangeListeners({
            entityType: 'game',
            entityId: this.currentSession.sessionId,
            operation: 'update',
            data: this.currentSession.gameState
          });
        } else {
          // Client-wins or merge strategy
          // Keep our changes but update version
          this.currentSession.version = serverSession.version;
          
          // Apply changes from the queue
          const combinedState = this.applyQueuedChanges(
            serverSession.gameState, 
            this.gameStateQueue
          );
          
          // Update session with combined state
          await dbService.updateGameSession(
            this.currentSession.sessionId, 
            combinedState
          );
          
          // Update local state
          this.currentSession.gameState = combinedState;
          this.currentSession.version++;
          
          // Clear queue after successful sync
          this.gameStateQueue = [];
        }
      } else {
        // We have the latest version, apply our changes
        const combinedState = this.applyQueuedChanges(
          this.currentSession.gameState,
          this.gameStateQueue
        );
        
        // Update server with our changes
        await dbService.updateGameSession(
          this.currentSession.sessionId, 
          combinedState
        );
        
        // Update local state
        this.currentSession.gameState = combinedState;
        this.currentSession.version++;
        
        // Clear queue after successful sync
        this.gameStateQueue = [];
      }
      
      this.lastServerSync = Date.now();
    } catch (error) {
      console.error('Error during game state sync:', error);
    }
  }
  
  // Apply queued changes to a base state
  private applyQueuedChanges(baseState: any, changes: DataChangeEvent[]): any {
    let resultState = { ...baseState };
    
    for (const change of changes) {
      if (change.operation === 'update') {
        // Deep merge the change data
        resultState = this.deepMerge(resultState, change.data);
      } else if (change.operation === 'delete' && change.entityId) {
        // Remove the specified property
        const path = change.entityId.split('.');
        let current = resultState;
        
        // Navigate to the parent object
        for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) break;
          current = current[path[i]];
        }
        
        // Delete the property
        if (current && path.length > 0) {
          delete current[path[path.length - 1]];
        }
      }
    }
    
    return resultState;
  }
  
  // Deep merge objects
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (source[key] instanceof Object && key in target && target[key] instanceof Object) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
  
  // Start a new game session
  public async startSession(walletAddress: string): Promise<GameSession | null> {
    try {
      // End current session if any
      if (this.currentSession) {
        await this.endSession();
      }
      
      // Create new session on server
      const sessionId = await dbService.createGameSession(walletAddress);
      if (!sessionId) {
        throw new Error('Failed to create game session');
      }
      
      // Get session details
      const session = await dbService.getGameSession(sessionId);
      if (!session) {
        throw new Error('Failed to retrieve game session');
      }
      
      this.currentSession = session;
      this.gameStateQueue = [];
      this.lastServerSync = Date.now();
      
      return session;
    } catch (error) {
      console.error('Error starting game session:', error);
      return null;
    }
  }
  
  // End the current session
  public async endSession(): Promise<boolean> {
    if (!this.currentSession) return true;
    
    try {
      // Force sync any pending changes
      await this.processPendingSync();
      
      // End session on server
      await dbService.endGameSession(this.currentSession.sessionId);
      
      // Clear local state
      this.currentSession = null;
      this.gameStateQueue = [];
      
      return true;
    } catch (error) {
      console.error('Error ending game session:', error);
      return false;
    }
  }
  
  // Update game state
  public updateGameState(changes: any, path: string = ''): void {
    if (!this.currentSession) return;
    
    // Create data change event
    const changeEvent: DataChangeEvent = {
      entityType: 'game',
      entityId: this.currentSession.sessionId,
      operation: 'update',
      data: path ? this.createNestedObject(path, changes) : changes
    };
    
    // Add to queue
    this.enqueueChange(changeEvent);
    
    // Update local state immediately
    if (path) {
      this.updateNestedProperty(this.currentSession.gameState, path, changes);
    } else {
      this.currentSession.gameState = this.deepMerge(
        this.currentSession.gameState, 
        changes
      );
    }
    
    // Notify listeners
    this.notifyChangeListeners(changeEvent);
    
    // Process sync if we have enough changes or it's been a while
    if (
      this.gameStateQueue.length >= 10 || 
      Date.now() - this.lastServerSync > SYNC_INTERVAL_MS * 2
    ) {
      this.processPendingSync();
    }
  }
  
  // Delete a property from game state
  public deleteGameStateProperty(path: string): void {
    if (!this.currentSession || !path) return;
    
    // Create data change event
    const changeEvent: DataChangeEvent = {
      entityType: 'game',
      entityId: path,
      operation: 'delete',
      data: null
    };
    
    // Add to queue
    this.enqueueChange(changeEvent);
    
    // Update local state immediately
    this.deleteNestedProperty(this.currentSession.gameState, path);
    
    // Notify listeners
    this.notifyChangeListeners(changeEvent);
  }
  
  // Add a change to the queue
  private enqueueChange(change: DataChangeEvent): void {
    this.gameStateQueue.push(change);
    
    // Limit queue size
    if (this.gameStateQueue.length > MAX_QUEUE_SIZE) {
      this.gameStateQueue.shift();
    }
  }
  
  // Create a nested object from a path and value
  private createNestedObject(path: string, value: any): any {
    const result: any = {};
    let current = result;
    const parts = path.split('.');
    
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    return result;
  }
  
  // Update a nested property
  private updateNestedProperty(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (!current[parts[parts.length - 1]]) {
        current[parts[parts.length - 1]] = {};
      }
      current[parts[parts.length - 1]] = {
        ...current[parts[parts.length - 1]],
        ...value
      };
    } else {
      current[parts[parts.length - 1]] = value;
    }
  }
  
  // Delete a nested property
  private deleteNestedProperty(obj: any, path: string): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) return;
      current = current[parts[i]];
    }
    
    delete current[parts[parts.length - 1]];
  }
  
  // Get current game state
  public getGameState(): any {
    return this.currentSession?.gameState || {};
  }
  
  // Get a specific value from the game state
  public getGameStateValue(path: string): any {
    if (!this.currentSession || !path) return undefined;
    
    const parts = path.split('.');
    let current = this.currentSession.gameState;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object') return undefined;
      current = current[part];
    }
    
    return current;
  }
  
  // Check if we have an active session
  public hasActiveSession(): boolean {
    return !!this.currentSession;
  }
  
  // Get current session ID
  public getSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }
  
  // Add change listener
  public addChangeListener(listener: (change: DataChangeEvent) => void): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }
  
  // Notify change listeners
  private notifyChangeListeners(change: DataChangeEvent): void {
    this.changeListeners.forEach(listener => {
      try {
        listener(change);
      } catch (error) {
        console.error('Error in game state change listener:', error);
      }
    });
  }
  
  // Force an immediate sync
  public async forceSync(): Promise<boolean> {
    if (!this.currentSession) return false;
    
    try {
      await this.processPendingSync();
      return true;
    } catch (error) {
      console.error('Error forcing sync:', error);
      return false;
    }
  }
  
  // Check if we're in offline mode
  public isOffline(): boolean {
    return this.offlineMode;
  }
}

// Export singleton instance
export const gameSyncManager = GameSyncManager.instance; 
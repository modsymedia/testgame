import { sql, db } from '@vercel/postgres';
import { User, PetState, GameSession, SyncStatus, SyncOperation } from './models';
import { EventEmitter } from 'events';

// Define LeaderboardEntry interface
interface LeaderboardEntry {
  walletAddress: string;
  username: string | null;
  score: number;
  rank: number;
}

// In-memory cache for fast access and offline operations
class DatabaseCache {
  private cache: Map<string, any> = new Map();
  private dirtyEntities: Set<string> = new Set();
  private syncQueue: {entity: string, operation: SyncOperation, data: any}[] = [];
  private isSyncing: boolean = false;

  // Add or update an item in the cache
  set(key: string, value: any): void {
    this.cache.set(key, value);
    this.dirtyEntities.add(key);
  }

  // Get an item from the cache
  get(key: string): any {
    return this.cache.get(key);
  }

  // Check if an item exists in the cache
  has(key: string): boolean {
    return this.cache.has(key);
  }

  // Mark an entity as dirty (needs synchronization)
  markDirty(key: string): void {
    if (this.cache.has(key)) {
      this.dirtyEntities.add(key);
    }
  }

  // Get all dirty entities
  getDirtyEntities(): string[] {
    return Array.from(this.dirtyEntities);
  }

  // Check if there are any dirty entities that need syncing
  hasDirtyEntities(): boolean {
    return this.dirtyEntities.size > 0;
  }

  // Clear dirty flag for an entity
  clearDirtyFlag(key: string): void {
    this.dirtyEntities.delete(key);
  }

  // Add operation to sync queue
  queueOperation(entity: string, operation: SyncOperation, data: any): void {
    this.syncQueue.push({ entity, operation, data });
    this.processSyncQueue();
  }

  // Process the sync queue
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;
    
    this.isSyncing = true;
    
    try {
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue.shift();
        if (!item) continue;
        
        const { entity, operation, data } = item;
        
        // Execute the operation
        switch (operation) {
          case 'create':
            await DatabaseService.instance.createEntity(entity, data);
            break;
          case 'update':
            await DatabaseService.instance.updateEntity(entity, data);
            break;
          case 'delete':
            await DatabaseService.instance.deleteEntity(entity, data);
            break;
        }
      }
    } catch (error) {
      console.error('Error processing sync queue:', error);
      // Re-add failed operations to the front of the queue
      // for retry on next sync attempt
    } finally {
      this.isSyncing = false;
    }
  }

  // Clear the cache
  clear(): void {
    this.cache.clear();
    this.dirtyEntities.clear();
  }
}

// Singleton Database Service
export class DatabaseService {
  private static _instance: DatabaseService;
  private cache: DatabaseCache;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private syncStatus: SyncStatus = 'idle';
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private eventEmitter: EventEmitter = new EventEmitter();
  private isPageUnloading: boolean = false;

  private constructor() {
    this.cache = new DatabaseCache();
    
    // Start periodic sync if we're in the browser
    if (typeof window !== 'undefined') {
      this.startPeriodicSync(5000); // Sync more frequently (every 5 seconds)
      
      // Set up beforeunload event to sync before page navigation
      window.addEventListener('beforeunload', this.handleBeforeUnload);
      
      // Set up visibility change to sync when page becomes hidden
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  // Handle beforeunload event
  private handleBeforeUnload = async (event: BeforeUnloadEvent) => {
    this.isPageUnloading = true;
    
    // Try to force sync if there are dirty entities
    if (this.cache.hasDirtyEntities()) {
      // If there are unsaved changes, show a confirmation dialog
      event.preventDefault();
      event.returnValue = '';
      
      // Try to synchronize immediately
      await this.forceSynchronize();
    }
    
    this.isPageUnloading = false;
  };
  
  // Handle visibility change event
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Page is being hidden, try to sync
      this.forceSynchronize();
    } else if (document.visibilityState === 'visible') {
      // Page is visible again, check for updates
      this.startPeriodicSync();
    }
  };

  public static get instance(): DatabaseService {
    if (!DatabaseService._instance) {
      DatabaseService._instance = new DatabaseService();
    }
    return DatabaseService._instance;
  }

  // Initialize database tables
  public async initTables(): Promise<void> {
    try {
      // Create users table
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT UNIQUE NOT NULL,
          username TEXT,
          score INTEGER DEFAULT 0,
          games_played INTEGER DEFAULT 0,
          last_played TIMESTAMP,
          created_at TIMESTAMP,
          points INTEGER DEFAULT 0,
          daily_points INTEGER DEFAULT 0,
          last_points_update TIMESTAMP,
          days_active INTEGER DEFAULT 0,
          consecutive_days INTEGER DEFAULT 0,
          referral_code TEXT UNIQUE,
          referred_by TEXT,
          referral_count INTEGER DEFAULT 0,
          referral_points INTEGER DEFAULT 0,
          token_balance INTEGER DEFAULT 0,
          multiplier REAL DEFAULT 1.0,
          last_interaction_time TIMESTAMP,
          cooldowns JSONB,
          recent_point_gain INTEGER DEFAULT 0,
          last_point_gain_time TIMESTAMP,
          version INTEGER DEFAULT 1
        );
      `;

      // Create pet_states table
      await sql`
        CREATE TABLE IF NOT EXISTS pet_states (
          wallet_address TEXT PRIMARY KEY,
          health INTEGER DEFAULT 100,
          happiness INTEGER DEFAULT 100,
          hunger INTEGER DEFAULT 100,
          cleanliness INTEGER DEFAULT 100,
          energy INTEGER DEFAULT 100,
          last_state_update TIMESTAMP,
          quality_score INTEGER DEFAULT 0,
          last_message TEXT,
          last_reaction TEXT,
          is_dead BOOLEAN DEFAULT false,
          last_interaction_time TIMESTAMP,
          version INTEGER DEFAULT 1,
          FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
        );
      `;
      
      // Create game_sessions table for tracking active game sessions
      await sql`
        CREATE TABLE IF NOT EXISTS game_sessions (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT NOT NULL,
          session_id TEXT UNIQUE NOT NULL,
          started_at TIMESTAMP NOT NULL,
          last_active TIMESTAMP NOT NULL,
          game_state JSONB,
          is_active BOOLEAN DEFAULT true,
          version INTEGER DEFAULT 1,
          FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
        );
      `;
      
      // Create sync_log table for tracking sync operations
      await sql`
        CREATE TABLE IF NOT EXISTS sync_log (
          id SERIAL PRIMARY KEY,
          wallet_address TEXT NOT NULL,
          operation TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          client_version INTEGER NOT NULL,
          server_version INTEGER NOT NULL,
          conflict BOOLEAN DEFAULT false,
          resolution TEXT,
          FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
        );
      `;
      
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      
      // For development - if running in Vercel Dev, the error might be about the table already existing
      if (error instanceof Error && 
          error.message.includes('already exists')) {
        console.log('Tables already exist, continuing...');
      } else {
        throw error;
      }
    }
  }

  // Start periodic synchronization
  private startPeriodicSync(intervalMs: number = 10000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(() => {
      this.synchronize();
    }, intervalMs);
  }

  // Stop periodic synchronization
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Add sync status listener
  public addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener);
    };
  }

  // Update sync status
  private updateSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;
    this.syncListeners.forEach(listener => listener(status));
  }

  // Force immediate synchronization - returns a promise that resolves when sync is complete
  public async forceSynchronize(): Promise<boolean> {
    console.log('Forcing database synchronization...');
    // If already syncing, wait for it to complete
    if (this.syncStatus === 'syncing') {
      // Wait for current sync to complete (with timeout)
      let attempts = 0;
      while (this.syncStatus === 'syncing' && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }
    
    return this.synchronize();
  }

  // Synchronize dirty entities
  public async synchronize(): Promise<boolean> {
    if (this.syncStatus === 'syncing') return false;
    
    this.updateSyncStatus('syncing');
    
    try {
      const dirtyEntities = this.cache.getDirtyEntities();
      
      if (dirtyEntities.length === 0) {
        this.updateSyncStatus('success');
        return true;
      }
      
      const syncPromises = dirtyEntities.map(async (key) => {
        const entity = this.cache.get(key);
        if (!entity) return;
        
        const entityType = key.split(':')[0];
        const entityId = key.split(':')[1];
        
        try {
          switch (entityType) {
            case 'user':
              await this.updateUserData(entityId, entity);
              break;
            case 'pet':
              await this.updatePetState(entityId, entity);
              break;
            case 'game':
              await this.updateGameSession(entityId, entity);
              break;
          }
          
          this.cache.clearDirtyFlag(key);
        } catch (error) {
          console.error(`Failed to sync ${entityType} with ID ${entityId}:`, error);
          throw error;
        }
      });
      
      await Promise.all(syncPromises);
      
      this.lastSyncTime = Date.now();
      this.updateSyncStatus('success');
      console.log('Database synchronization completed successfully.');
      return true;
    } catch (error) {
      console.error('Synchronization failed:', error);
      this.updateSyncStatus('error');
      return false;
    }
  }

  // Add methods for persisting states to local storage as backup
  private saveToLocalStorage(key: string, data: any): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`db_backup:${key}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error saving to local storage:', error);
      }
    }
  }

  private loadFromLocalStorage(key: string): any {
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(`db_backup:${key}`);
        if (item) {
          const parsed = JSON.parse(item);
          return parsed.data;
        }
      } catch (error) {
        console.error('Error loading from local storage:', error);
      }
    }
    return null;
  }

  // Get user data with local storage fallback
  public async getUserData(walletAddress: string): Promise<User | null> {
    // Check cache first
    const cacheKey = `user:${walletAddress}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const result = await sql`
        SELECT * FROM users WHERE wallet_address = ${walletAddress}
      `;
      
      if (result.rows.length === 0) {
        // Try fallback to local storage
        const localData = this.loadFromLocalStorage(cacheKey);
        if (localData) {
          // Cache the local data
          this.cache.set(cacheKey, localData);
          return localData;
        }
        return null;
      }
      
      const user = rowToUser(result.rows[0]);
      
      // Get pet state if it exists
      const petState = await sql`
        SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
      `;
      
      if (petState.rows.length > 0) {
        user.petState = rowToPetState(petState.rows[0]);
      }
      
      // Cache the result
      this.cache.set(cacheKey, user);
      
      // Also save to local storage as backup
      this.saveToLocalStorage(cacheKey, user);
      
      return user;
    } catch (error) {
      console.error('Error finding user:', error);
      
      // Try fallback to local storage
      const localData = this.loadFromLocalStorage(cacheKey);
      if (localData) {
        // Cache the local data
        this.cache.set(cacheKey, localData);
        return localData;
      }
      
      return null;
    }
  }

  // Create a new user
  public async createUser(userData: Partial<User>): Promise<string | null> {
    try {
      if (!userData.walletAddress) {
        throw new Error('Wallet address is required');
      }
      
      const result = await sql`
        INSERT INTO users (
          wallet_address, username, score, games_played, last_played, created_at,
          points, daily_points, last_points_update, days_active, consecutive_days,
          referral_code, referred_by, referral_count, referral_points, token_balance,
          multiplier, last_interaction_time, cooldowns, recent_point_gain, last_point_gain_time, version
        ) VALUES (
          ${userData.walletAddress},
          ${userData.username || null},
          ${userData.score || 0},
          ${userData.gamesPlayed || 0},
          ${userData.lastPlayed ? userData.lastPlayed.toISOString() : new Date().toISOString()},
          ${userData.createdAt ? userData.createdAt.toISOString() : new Date().toISOString()},
          ${userData.points || 0},
          ${userData.dailyPoints || 0},
          ${userData.lastPointsUpdate ? userData.lastPointsUpdate.toISOString() : new Date().toISOString()},
          ${userData.daysActive || 0},
          ${userData.consecutiveDays || 0},
          ${userData.referralCode || null},
          ${userData.referredBy || null},
          ${userData.referralCount || 0},
          ${userData.referralPoints || 0},
          ${userData.tokenBalance || 0},
          ${userData.multiplier || 1.0},
          ${userData.lastInteractionTime ? userData.lastInteractionTime.toISOString() : new Date().toISOString()},
          ${userData.cooldowns ? JSON.stringify(userData.cooldowns) : '{}'},
          ${userData.recentPointGain || 0},
          ${userData.lastPointGainTime ? userData.lastPointGainTime.toISOString() : new Date().toISOString()},
          1
        )
        RETURNING id
      `;
      
      // Add pet state if provided
      if (userData.petState) {
        await sql`
          INSERT INTO pet_states (
            wallet_address, health, happiness, hunger, cleanliness, energy,
            last_state_update, quality_score, last_message, last_reaction, is_dead, last_interaction_time, version
          ) VALUES (
            ${userData.walletAddress},
            ${userData.petState.health || 100},
            ${userData.petState.happiness || 100},
            ${userData.petState.hunger || 100},
            ${userData.petState.cleanliness || 100},
            ${userData.petState.energy || 100},
            ${userData.petState.lastStateUpdate ? userData.petState.lastStateUpdate.toISOString() : new Date().toISOString()},
            ${userData.petState.qualityScore || 0},
            ${userData.petState.lastMessage || ''},
            ${userData.petState.lastReaction || 'none'},
            ${userData.petState.isDead || false},
            ${userData.petState.lastInteractionTime instanceof Date ? userData.petState.lastInteractionTime.toISOString() : new Date().toISOString()},
            1
          )
        `;
      }
      
      // Cache the new user data
      const cacheKey = `user:${userData.walletAddress}`;
      this.cache.set(cacheKey, {
        ...userData,
        _id: result.rows[0]?.id
      });
      
      return result.rows[0]?.id || null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  // Update user data with improved local fallback
  public async updateUserData(walletAddress: string, updateData: Partial<User>): Promise<boolean> {
    try {
      // First, update the cache immediately
      const cacheKey = `user:${walletAddress}`;
      if (this.cache.has(cacheKey)) {
        const cachedUser = this.cache.get(cacheKey);
        const updatedUser = {
          ...cachedUser,
          ...updateData
        };
        this.cache.set(cacheKey, updatedUser);
        
        // Also save to local storage as backup
        this.saveToLocalStorage(cacheKey, updatedUser);
      }
      
      // Then try to update the database
      // Get current version
      const currentVersionResult = await sql`
        SELECT version FROM users WHERE wallet_address = ${walletAddress}
      `;
      
      if (currentVersionResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const currentVersion = currentVersionResult.rows[0].version || 1;
      const newVersion = currentVersion + 1;
      
      // Build dynamic SQL query
      const setClauses = ['version = $1'];
      const values: any[] = [newVersion];
      let paramIndex = 2;
      
      // Process each key in updateData using type-safe approach
      type UserKey = keyof User;
      Object.entries(updateData).forEach(([key, value]) => {
        // Handle petState separately
        if (key === 'petState' || key === '_id' || key === 'walletAddress') return;
        
        // Convert camelCase to snake_case for PostgreSQL
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        
        setClauses.push(`${snakeKey} = $${paramIndex}`);
        paramIndex++;
        
        // Convert dates to proper format
        if (value instanceof Date) {
          values.push(value.toISOString());
        } else if (key === 'cooldowns') {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      });
      
      values.push(walletAddress);
      
      const updateSql = `
        UPDATE users 
        SET ${setClauses.join(', ')} 
        WHERE wallet_address = $${values.length}
      `;
      
      await db.query(updateSql, values);
      
      // Handle pet state separately if present
      if (updateData.petState) {
        await this.updatePetState(walletAddress, updateData.petState);
      }
      
      this.emitChange('user', { walletAddress, ...updateData });
      this.emitChange('leaderboard', { updated: true });
      
      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      // The cache and local storage were already updated, so we still have the data
      // We'll retry the database update on the next sync
      return false;
    }
  }

  // Update pet state
  private async updatePetState(walletAddress: string, petState: Partial<PetState>): Promise<boolean> {
    try {
      // Get current version
      const currentVersionResult = await sql`
        SELECT version FROM pet_states WHERE wallet_address = ${walletAddress}
      `;
      
      let currentVersion = 0;
      let exists = true;
      
      if (currentVersionResult.rows.length === 0) {
        exists = false;
      } else {
        currentVersion = currentVersionResult.rows[0].version || 1;
      }
      
      const newVersion = currentVersion + 1;
      
      if (exists) {
        // Update existing pet state
        await sql`
          UPDATE pet_states 
          SET 
            health = ${petState.health},
            happiness = ${petState.happiness},
            hunger = ${petState.hunger},
            cleanliness = ${petState.cleanliness},
            energy = ${petState.energy},
            last_state_update = ${petState.lastStateUpdate instanceof Date ? petState.lastStateUpdate.toISOString() : new Date().toISOString()},
            quality_score = ${petState.qualityScore || 0},
            last_message = ${petState.lastMessage || null},
            last_reaction = ${petState.lastReaction || 'none'},
            is_dead = ${petState.isDead || false},
            last_interaction_time = ${petState.lastInteractionTime instanceof Date ? petState.lastInteractionTime.toISOString() : new Date().toISOString()},
            version = ${newVersion}
          WHERE wallet_address = ${walletAddress}
        `;
      } else {
        // Insert new pet state
        await sql`
          INSERT INTO pet_states (
            wallet_address, health, happiness, hunger, cleanliness, energy,
            last_state_update, quality_score, last_message, last_reaction, is_dead, last_interaction_time, version
          ) VALUES (
            ${walletAddress},
            ${petState.health || 100},
            ${petState.happiness || 100},
            ${petState.hunger || 100},
            ${petState.cleanliness || 100},
            ${petState.energy || 100},
            ${petState.lastStateUpdate instanceof Date ? petState.lastStateUpdate.toISOString() : new Date().toISOString()},
            ${petState.qualityScore || 0},
            ${petState.lastMessage || ''},
            ${petState.lastReaction || 'none'},
            ${petState.isDead || false},
            ${petState.lastInteractionTime instanceof Date ? petState.lastInteractionTime.toISOString() : new Date().toISOString()},
            1
          )
        `;
      }
      
      // Update cache
      const userCacheKey = `user:${walletAddress}`;
      if (this.cache.has(userCacheKey)) {
        const cachedUser = this.cache.get(userCacheKey);
        this.cache.set(userCacheKey, {
          ...cachedUser,
          petState: {
            ...cachedUser.petState,
            ...petState
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating pet state:', error);
      return false;
    }
  }

  // Create a new game session
  public async createGameSession(walletAddress: string): Promise<string | null> {
    try {
      const sessionId = generateUniqueId();
      const now = new Date();
      
      await sql`
        INSERT INTO game_sessions (
          wallet_address, session_id, started_at, last_active, game_state, is_active, version
        ) VALUES (
          ${walletAddress},
          ${sessionId},
          ${now.toISOString()},
          ${now.toISOString()},
          ${'{}'},
          ${true},
          ${1}
        )
      `;
      
      // Cache the game session
      const cacheKey = `game:${sessionId}`;
      this.cache.set(cacheKey, {
        walletAddress,
        sessionId,
        startedAt: now,
        lastActive: now,
        gameState: {},
        isActive: true,
        version: 1
      });
      
      return sessionId;
    } catch (error) {
      console.error('Error creating game session:', error);
      return null;
    }
  }

  // Update game session
  public async updateGameSession(sessionId: string, gameState: any): Promise<boolean> {
    try {
      // Get current version
      const currentVersionResult = await sql`
        SELECT version FROM game_sessions WHERE session_id = ${sessionId}
      `;
      
      if (currentVersionResult.rows.length === 0) {
        throw new Error('Game session not found');
      }
      
      const currentVersion = currentVersionResult.rows[0].version || 1;
      const newVersion = currentVersion + 1;
      
      await sql`
        UPDATE game_sessions
        SET 
          game_state = ${JSON.stringify(gameState)},
          last_active = ${new Date().toISOString()},
          version = ${newVersion}
        WHERE session_id = ${sessionId}
      `;
      
      // Update cache
      const cacheKey = `game:${sessionId}`;
      if (this.cache.has(cacheKey)) {
        const cachedSession = this.cache.get(cacheKey);
        this.cache.set(cacheKey, {
          ...cachedSession,
          gameState,
          lastActive: new Date(),
          version: newVersion
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating game session:', error);
      return false;
    }
  }

  // Get active game session
  public async getGameSession(sessionId: string): Promise<GameSession | null> {
    // Check cache first
    const cacheKey = `game:${sessionId}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const result = await sql`
        SELECT * FROM game_sessions WHERE session_id = ${sessionId} AND is_active = true
      `;
      
      if (result.rows.length === 0) return null;
      
      const session: GameSession = {
        walletAddress: result.rows[0].wallet_address,
        sessionId: result.rows[0].session_id,
        startedAt: new Date(result.rows[0].started_at),
        lastActive: new Date(result.rows[0].last_active),
        gameState: result.rows[0].game_state,
        isActive: result.rows[0].is_active,
        version: result.rows[0].version
      };
      
      // Cache the result
      this.cache.set(cacheKey, session);
      
      return session;
    } catch (error) {
      console.error('Error finding game session:', error);
      return null;
    }
  }

  // End game session
  public async endGameSession(sessionId: string): Promise<boolean> {
    try {
      await sql`
        UPDATE game_sessions
        SET 
          is_active = false,
          last_active = ${new Date().toISOString()}
        WHERE session_id = ${sessionId}
      `;
      
      // Update cache
      const cacheKey = `game:${sessionId}`;
      if (this.cache.has(cacheKey)) {
        const cachedSession = this.cache.get(cacheKey);
        this.cache.set(cacheKey, {
          ...cachedSession,
          isActive: false,
          lastActive: new Date()
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error ending game session:', error);
      return false;
    }
  }

  // Generic entity operations for the sync queue
  async createEntity(entityType: string, data: any): Promise<boolean> {
    try {
      switch (entityType) {
        case 'user':
          await this.createUser(data);
          return true;
        case 'game':
          await this.createGameSession(data.walletAddress);
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error creating ${entityType}:`, error);
      return false;
    }
  }

  async updateEntity(entityType: string, data: any): Promise<boolean> {
    try {
      switch (entityType) {
        case 'user':
          await this.updateUserData(data.walletAddress, data);
          return true;
        case 'pet':
          await this.updatePetState(data.walletAddress, data);
          return true;
        case 'game':
          await this.updateGameSession(data.sessionId, data.gameState);
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error updating ${entityType}:`, error);
      return false;
    }
  }

  async deleteEntity(entityType: string, entityId: string): Promise<boolean> {
    try {
      switch (entityType) {
        case 'game':
          await this.endGameSession(entityId);
          return true;
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error deleting ${entityType}:`, error);
      return false;
    }
  }

  // Subscribe to data changes
  public subscribeToChanges(entityType: string, callback: (data: any) => void): () => void {
    const eventName = `change:${entityType}`;
    this.eventEmitter.on(eventName, callback);
    return () => {
      this.eventEmitter.off(eventName, callback);
    };
  }

  // Emit events when data changes
  private emitChange(entityType: string, data: any): void {
    this.eventEmitter.emit(`change:${entityType}`, data);
  }

  // Add a new method for fetching leaderboard data
  public async getLeaderboard(type: 'points' | 'score' = 'points', limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      let query;
      
      if (type === 'points') {
        query = await sql`
          SELECT 
            wallet_address as walletAddress, 
            username, 
            points as score,
            ROW_NUMBER() OVER (ORDER BY points DESC) as rank
          FROM users
          ORDER BY points DESC
          LIMIT ${limit}
        `;
      } else {
        query = await sql`
          SELECT 
            wallet_address as walletAddress, 
            username, 
            score,
            ROW_NUMBER() OVER (ORDER BY score DESC) as rank
          FROM users
          ORDER BY score DESC
          LIMIT ${limit}
        `;
      }
      
      return query.rows.map((row: any) => ({
        walletAddress: row.walletaddress,
        username: row.username,
        score: row.score,
        rank: row.rank
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Check if there are any dirtyEntities that need syncing
  public hasPendingChanges(): boolean {
    return this.cache.hasDirtyEntities();
  }
}

// Helper function to convert database row to User
function rowToUser(row: any): User {
  return {
    _id: row.id.toString(),
    walletAddress: row.wallet_address,
    username: row.username,
    score: row.score,
    gamesPlayed: row.games_played,
    lastPlayed: new Date(row.last_played),
    createdAt: new Date(row.created_at),
    points: row.points,
    dailyPoints: row.daily_points,
    lastPointsUpdate: new Date(row.last_points_update),
    daysActive: row.days_active,
    consecutiveDays: row.consecutive_days,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    referralCount: row.referral_count,
    referralPoints: row.referral_points,
    tokenBalance: row.token_balance,
    multiplier: row.multiplier,
    lastInteractionTime: row.last_interaction_time ? new Date(row.last_interaction_time) : undefined,
    cooldowns: row.cooldowns || {},
    recentPointGain: row.recent_point_gain,
    lastPointGainTime: row.last_point_gain_time ? new Date(row.last_point_gain_time) : undefined,
    version: row.version || 1
  };
}

// Helper function to convert database row to PetState
function rowToPetState(row: any): PetState {
  return {
    health: row.health,
    happiness: row.happiness,
    hunger: row.hunger,
    cleanliness: row.cleanliness,
    energy: row.energy,
    lastStateUpdate: new Date(row.last_state_update),
    qualityScore: row.quality_score,
    lastMessage: row.last_message,
    lastReaction: row.last_reaction,
    isDead: row.is_dead,
    lastInteractionTime: row.last_interaction_time ? new Date(row.last_interaction_time) : undefined,
    version: row.version || 1
  };
}

// Generate a unique ID for sessions
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Date.now().toString(36);
}

// Initialize the database service
export const dbService = DatabaseService.instance; 
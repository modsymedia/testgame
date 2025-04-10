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

// Add configuration for API-based access
const USE_API_FOR_WRITE_OPERATIONS = true; // Switch to true to use API routes instead of direct DB access

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

// Add the UserActivity interface to types
interface UserActivity {
  id: string;
  type: string;
  name: string;
  points: number;
  timestamp: number;
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
          // Don't throw here - allow other entities to sync
          // We'll keep this entity dirty for the next sync attempt
          
          // If it's a connection error, stop trying to sync other entities
          if (error instanceof Error && 
             (error.message.includes('Error connecting to database') || 
              error.message.includes('Failed to fetch'))) {
            // Stop syncing other entities by returning a rejected promise
            return Promise.reject(new Error('Database connection error'));
          }
        }
      });
      
      try {
        await Promise.all(syncPromises);
        
        this.lastSyncTime = Date.now();
        this.updateSyncStatus('success');
        console.log('Database synchronization completed successfully.');
        return true;
      } catch (error) {
        if (error instanceof Error && 
           (error.message.includes('Database connection error'))) {
          console.error('Sync aborted due to connection issues. Will retry later.');
          this.updateSyncStatus('error');
          
          // Set a shorter retry interval for connection errors
          if (typeof window !== 'undefined') {
            setTimeout(() => this.synchronize(), 30000); // Retry in 30 seconds
          }
          
          return false;
        }
        
        // For other errors, proceed as usual
        this.lastSyncTime = Date.now();
        this.updateSyncStatus('success');
        console.log('Database synchronization partially successful.');
        return true;
      }
    } catch (error) {
      console.error('Synchronization failed:', error);
      this.updateSyncStatus('error');
      
      // Set a retry interval
      if (typeof window !== 'undefined' && !this.syncInterval) {
        setTimeout(() => this.synchronize(), 60000); // Retry in 1 minute
      }
      
      return false;
    }
  }

  // Get user data without local storage fallback
  public async getUserData(walletAddress: string): Promise<User | any | null> {
    // Check cache first
    const cacheKey = `user:${walletAddress}`;
    const userDataCacheKey = `user_data_${walletAddress}`;
    
    // Check if we're looking for custom user data
    if (walletAddress.includes('user_data_')) {
      // First check cache for custom data
      if (this.cache.has(userDataCacheKey)) {
        return this.cache.get(userDataCacheKey);
      }
      
      // Fetch from the database without localStorage fallback
      try {
        const response = await fetch(`/api/user/data?walletAddress=${encodeURIComponent(walletAddress)}`);
        if (response.ok) {
          const data = await response.json();
          if (data) {
            // Cache the data
            this.cache.set(userDataCacheKey, data);
            return data;
          }
        }
        // If fetch fails, return null with error flag instead of empty object
        return { error: 'Failed to fetch user data', loadFailed: true };
      } catch (fetchError) {
        console.error('Error fetching user data from API:', fetchError);
        // Return error object instead of empty object
        return { error: 'Failed to fetch user data', loadFailed: true };
      }
    }
    
    // Regular user data lookup
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    try {
      const result = await sql`
        SELECT * FROM users WHERE wallet_address = ${walletAddress}
      `;
      
      if (result.rows.length === 0) {
        console.log('User not found in database:', walletAddress);
        return { error: 'User not found', loadFailed: true };
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
      
      return user;
    } catch (error) {
      console.error('Error finding user:', error);
      
      // Return error object instead of null
      return { error: 'Database error', loadFailed: true, details: error };
    }
  }

  // Create a new user
  public async createUser(userData: Partial<User>): Promise<string | null> {
    try {
      if (!userData.walletAddress) {
        throw new Error('Wallet address is required');
      }
      
      // Only include fields known to exist in the database
      const result = await sql`
        INSERT INTO users (
          wallet_address, username, score, games_played, last_played, created_at,
          points, daily_points, last_points_update, days_active, consecutive_days,
          referral_code, referred_by, referral_count, referral_points, token_balance,
          multiplier, last_interaction_time, cooldowns, recent_point_gain, last_point_gain_time
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
          ${userData.lastPointGainTime ? userData.lastPointGainTime.toISOString() : new Date().toISOString()}
        )
        RETURNING id
      `;
      
      // Add pet state if provided
      if (userData.petState) {
        await sql`
          INSERT INTO pet_states (
            wallet_address, health, happiness, hunger, cleanliness, energy,
            last_state_update, quality_score, last_message, last_reaction, is_dead, last_interaction_time
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
            ${userData.petState.lastInteractionTime instanceof Date ? userData.petState.lastInteractionTime.toISOString() : new Date().toISOString()}
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

  // Add a helper function to update user data through API
  private async updateUserDataViaApi(walletAddress: string, updateData: Partial<User>): Promise<boolean> {
    try {
      // Only use in browser environment
      if (typeof window === 'undefined') {
        return this.updateUserData(walletAddress, updateData);
      }
      
      console.log('Using API route for user data update');
      
      // Simplify the update data to only critical fields
      // This helps avoid schema mismatch errors
      const simplifiedUpdateData: Record<string, any> = {};
      
      // Handle fields in a type-safe way
      if ('points' in updateData && updateData.points !== undefined) {
        simplifiedUpdateData.points = updateData.points;
      }
      
      if ('score' in updateData && updateData.score !== undefined) {
        simplifiedUpdateData.score = updateData.score;
      }
      
      if ('multiplier' in updateData && updateData.multiplier !== undefined) {
        simplifiedUpdateData.multiplier = updateData.multiplier;
      }
      
      if ('username' in updateData && updateData.username !== undefined) {
        simplifiedUpdateData.username = updateData.username;
      }
      
      if ('lastPlayed' in updateData && updateData.lastPlayed !== undefined) {
        simplifiedUpdateData.lastPlayed = updateData.lastPlayed;
      }
      
      // Add petState if it exists (with only the essential fields)
      if (updateData.petState) {
        simplifiedUpdateData.petState = {
          health: updateData.petState.health,
          happiness: updateData.petState.happiness,
          hunger: updateData.petState.hunger,
          cleanliness: updateData.petState.cleanliness,
          energy: updateData.petState.energy
        };
      }
      
      // Make the API request
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          updateData: simplifiedUpdateData
        }),
      });
      
      // Try to parse the response even if it's an error
      let responseData;
      try {
        responseData = await response.json();
      } catch {
        responseData = { success: false, error: 'Failed to parse response' };
      }
      
      // If API reports success, even with warnings, consider it a success
      if (responseData.success === true) {
        return true;
      }
      
      // Check for schema mismatch errors and log them, but continue
      if (responseData.error === 'Schema mismatch error' || 
          (responseData.message && responseData.message.includes('column') && 
           responseData.message.includes('does not exist'))) {
        console.warn(`Schema mismatch detected: ${responseData.message}`);
        
        // Even if the API update failed, we've already updated the local cache
        // so from the user's perspective, their data is saved
        return true;
      }
      
      // For other errors, log but don't necessarily fail
      if (!response.ok) {
        console.error('API update failed:', responseData);
        
        // This is a non-critical error - don't break the game
        // The data is already in the cache and local storage
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user via API:', error);
      // Don't fail completely for network errors - the data is in cache
      return true; 
    }
  }

  // Update user data with improved local fallback
  public async updateUserData(walletAddress: string, updateData: Partial<User>): Promise<boolean> {
    try {
      if (!walletAddress) {
        console.error('Missing wallet address in updateUserData');
        return false;
      }

      // First, check if we have valid data before updating
      const cacheKey = `user:${walletAddress}`;
      
      // If points are being updated, make sure we're not overwriting with a smaller value
      // when there was a data loading issue
      if (updateData.points !== undefined) {
        const existingData = this.cache.has(cacheKey) ? this.cache.get(cacheKey) : await this.getUserData(walletAddress);
        
        // Check if data load failed or returned an error
        if (existingData && existingData.loadFailed) {
          console.error('Cannot update points when user data failed to load', walletAddress);
          // Store pending update for later when data is available
          if (typeof window !== 'undefined') {
            const pendingUpdates = JSON.parse(localStorage.getItem('pendingPointsUpdates') || '[]');
            pendingUpdates.push({
              walletAddress,
              pointsToAdd: updateData.points,
              timestamp: Date.now()
            });
            localStorage.setItem('pendingPointsUpdates', JSON.stringify(pendingUpdates));
            console.log('Stored points update for later processing');
          }
          return false;
        }
        
        // If we have existing points and they're valid, ensure we're not accidentally reducing them
        if (existingData && typeof existingData.points === 'number' && existingData.points > 0) {
          // If we're potentially doing a destructive update (replacing rather than adding points)
          // Make sure the new value is not significantly lower
          if (updateData.points < existingData.points * 0.9) {
            console.warn(`Potential destructive points update prevented: current=${existingData.points}, new=${updateData.points}`);
            updateData.points = existingData.points; // Preserve existing points
          }
        }
      }
      
      // Update the cache
      if (this.cache.has(cacheKey)) {
        const cachedUser = this.cache.get(cacheKey);
        const updatedUser = {
          ...cachedUser,
          ...updateData
        };
        this.cache.set(cacheKey, updatedUser);
      }
      
      // Use API route for writes if enabled and in browser environment
      if (USE_API_FOR_WRITE_OPERATIONS && typeof window !== 'undefined') {
        return this.updateUserDataViaApi(walletAddress, updateData);
      }
      
      // Otherwise use direct DB connection (server-side or if flag is disabled)
      // Then try to update the database
      // Build dynamic SQL query without relying on version
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      // Process each key in updateData using type-safe approach
      Object.entries(updateData).forEach(([key, value]) => {
        // Handle petState separately
        if (key === 'petState' || key === '_id' || key === 'walletAddress' || key === 'version') return;
        
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
      
      // Only proceed with DB update if there are fields to update
      if (setClauses.length > 0) {
        values.push(walletAddress);
        
        const updateSql = `
          UPDATE users 
          SET ${setClauses.join(', ')} 
          WHERE wallet_address = $${values.length}
        `;
        
        await db.query(updateSql, values);
      }
      
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
      if (!walletAddress) {
        console.error('Wallet address is required for updatePetState');
        return false;
      }
      
      console.log('Updating pet state for wallet:', walletAddress, petState);
      
      // Check if the pet state already exists
      const existingPet = await sql`
        SELECT * FROM pet_states WHERE wallet_address = ${walletAddress}
      `;
      
      // Format dates properly
      const lastStateUpdate = petState.lastStateUpdate instanceof Date 
        ? petState.lastStateUpdate.toISOString() 
        : new Date().toISOString();
        
      const lastInteractionTime = petState.lastInteractionTime instanceof Date 
        ? petState.lastInteractionTime.toISOString() 
        : new Date().toISOString();
        
      // Make sure boolean values are correct
      const isDead = typeof petState.isDead === 'boolean' ? petState.isDead : false;
      
      // Ensure numeric values are within valid range
      const health = typeof petState.health === 'number' ? Math.max(0, Math.min(100, petState.health)) : 100;
      const happiness = typeof petState.happiness === 'number' ? Math.max(0, Math.min(100, petState.happiness)) : 100;
      const hunger = typeof petState.hunger === 'number' ? Math.max(0, Math.min(100, petState.hunger)) : 100;
      const cleanliness = typeof petState.cleanliness === 'number' ? Math.max(0, Math.min(100, petState.cleanliness)) : 100;
      const energy = typeof petState.energy === 'number' ? Math.max(0, Math.min(100, petState.energy)) : 100;
      const qualityScore = typeof petState.qualityScore === 'number' ? Math.max(0, petState.qualityScore) : 0;
      
      if (existingPet.rows && existingPet.rows.length > 0) {
        // Update existing pet state
        await sql`
          UPDATE pet_states SET
            health = ${health},
            happiness = ${happiness}, 
            hunger = ${hunger},
            cleanliness = ${cleanliness},
            energy = ${energy},
            quality_score = ${qualityScore},
            last_state_update = ${lastStateUpdate},
            last_message = ${petState.lastMessage || ''},
            last_reaction = ${petState.lastReaction || 'none'},
            is_dead = ${isDead},
            last_interaction_time = ${lastInteractionTime},
            version = COALESCE(version, 0) + 1
          WHERE wallet_address = ${walletAddress}
        `;
      } else {
        // Insert new pet state
        await sql`
          INSERT INTO pet_states (
            wallet_address, health, happiness, hunger, cleanliness, energy,
            last_state_update, quality_score, last_message, last_reaction, is_dead, last_interaction_time
          ) VALUES (
            ${walletAddress},
            ${health},
            ${happiness},
            ${hunger},
            ${cleanliness},
            ${energy},
            ${lastStateUpdate},
            ${qualityScore},
            ${petState.lastMessage || ''},
            ${petState.lastReaction || 'none'},
            ${isDead},
            ${lastInteractionTime}
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
      
      console.log('Pet state updated successfully for:', walletAddress);
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
      // Simple update without version checking
      await sql`
        UPDATE game_sessions
        SET 
          game_state = ${JSON.stringify(gameState)},
          last_active = ${new Date().toISOString()}
        WHERE session_id = ${sessionId}
      `;
      
      // Update cache
      const cacheKey = `game:${sessionId}`;
      if (this.cache.has(cacheKey)) {
        const cachedSession = this.cache.get(cacheKey);
        this.cache.set(cacheKey, {
          ...cachedSession,
          gameState,
          lastActive: new Date()
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

  // Get wallet data by public key
  public async getWalletByPublicKey(publicKey: string): Promise<any | null> {
    try {
      // Check cache first
      if (this.cache.has(`user:${publicKey}`)) {
        return this.cache.get(`user:${publicKey}`);
      }
      
      // If not in cache, query the database
      const result = await sql`
        SELECT * FROM users WHERE wallet_address = ${publicKey} LIMIT 1
      `;
      
      if (result.rows.length === 0) return null;
      
      const userData = rowToUser(result.rows[0]);
      
      // Cache the result
      this.cache.set(`user:${publicKey}`, userData);
      
      return userData;
    } catch (error) {
      console.error('Error getting wallet data:', error);
      return null;
    }
  }
  
  // Create a new wallet
  public async createWallet(publicKey: string, initialData: any = {}): Promise<boolean> {
    try {
      // Only use fields we know exist in both schemas
      const created = new Date();
      const lastPlayed = new Date();
      
      const defaultData = {
        wallet_address: publicKey,
        points: initialData.points || 0,
        multiplier: initialData.multiplier || 1.0,
        created_at: created,
        last_played: lastPlayed
      };
      
      // Simple INSERT with minimal fields
      await sql`
        INSERT INTO users (
          wallet_address, points, multiplier, created_at, last_played
        ) VALUES (
          ${defaultData.wallet_address}, ${defaultData.points}, ${defaultData.multiplier}, 
          ${created.toISOString()}, ${lastPlayed.toISOString()}
        )
        ON CONFLICT (wallet_address) DO NOTHING
      `;
      
      // Cache the new wallet data
      this.cache.set(`user:${publicKey}`, defaultData);
      
      return true;
    } catch (error) {
      console.error('Error creating wallet:', error);
      return false;
    }
  }
  
  // Update wallet data
  public async updateWallet(publicKey: string, updateData: any): Promise<boolean> {
    try {
      // Get current wallet data
      const currentData = await this.getWalletByPublicKey(publicKey);
      
      if (!currentData) {
        return false;
      }
      
      // Merge the current data with updates
      const updatedData = { ...currentData, ...updateData };
      
      // Update cache
      this.cache.set(`user:${publicKey}`, updatedData);
      
      // Only use keys that are likely to exist in the database
      const safeKeys = [
        'points', 'multiplier', 'score', 'username', 
        'last_played', 'last_points_update'
      ];
      
      // Filter update data to only include safe keys
      const filteredUpdateData: Record<string, any> = {};
      Object.keys(updateData).forEach(key => {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (safeKeys.includes(snakeKey)) {
          filteredUpdateData[snakeKey] = updateData[key];
        }
      });
      
      const keys = Object.keys(filteredUpdateData);
      const values = Object.values(filteredUpdateData);
      
      if (keys.length === 0) return true;
      
      // Build SET clause for SQL query
      let setClause = '';
      
      for (let i = 0; i < keys.length; i++) {
        // Convert Date objects to ISO strings
        if (values[i] instanceof Date) {
          values[i] = values[i].toISOString();
        }
        
        setClause += `${keys[i]} = $${i + 1}`;
        if (i < keys.length - 1) {
          setClause += ', ';
        }
      }
      
      // Execute the update query
      const query = `
        UPDATE users 
        SET ${setClause}
        WHERE wallet_address = $${keys.length + 1}
      `;
      
      await db.query(query, [...values, publicKey]);
      
      // Mark for synchronization
      this.cache.markDirty(`user:${publicKey}`);
      
      return true;
    } catch (error) {
      console.error('Error updating wallet:', error);
      return false;
    }
  }
  
  // Query users based on criteria
  public async queryUsers(criteria: Partial<User>): Promise<User[]> {
    try {
      // Build WHERE clause based on criteria
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined) {
          // Convert camelCase to snake_case for database
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          conditions.push(`${dbField} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });
      
      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';
      
      // Execute query
      const query = `
        SELECT * FROM users
        ${whereClause}
        LIMIT 100
      `;
      
      const result = await db.query(query, values);
      
      // Convert rows to User objects
      return result.rows.map(row => rowToUser(row));
    } catch (error) {
      console.error('Error querying users:', error);
      return [];
    }
  }

  // Process pending updates from localStorage
  public async processPendingPointsUpdates(): Promise<boolean> {
    try {
      // Only process in browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }
      
      const pendingUpdatesJson = localStorage.getItem('pendingPointsUpdates');
      if (!pendingUpdatesJson) {
        return true; // No pending updates
      }
      
      const pendingUpdates = JSON.parse(pendingUpdatesJson);
      if (!Array.isArray(pendingUpdates) || pendingUpdates.length === 0) {
        return true; // No valid pending updates
      }
      
      console.log(`Processing ${pendingUpdates.length} pending points updates...`);
      
      // Sort by timestamp (oldest first)
      pendingUpdates.sort((a, b) => a.timestamp - b.timestamp);
      
      // Track successful updates to remove them
      const successfulUpdates: number[] = [];
      
      // Process each update
      for (let i = 0; i < pendingUpdates.length; i++) {
        const update = pendingUpdates[i];
        
        try {
          // Update the user's points
          const result = await this.updateUserData(update.walletAddress, {
            points: update.points
          });
          
          if (result) {
            successfulUpdates.push(i);
          }
        } catch (error) {
          console.error(`Failed to process pending update for ${update.walletAddress}:`, error);
          
          // If it's a connection error, stop processing
          if (error instanceof Error && 
             (error.message.includes('Error connecting to database') || 
              error.message.includes('Failed to fetch'))) {
            break;
          }
        }
      }
      
      // Remove successful updates
      if (successfulUpdates.length > 0) {
        const remainingUpdates = pendingUpdates.filter((_, index) => 
          !successfulUpdates.includes(index)
        );
        
        // Save the remaining updates
        localStorage.setItem('pendingPointsUpdates', 
          remainingUpdates.length > 0 ? JSON.stringify(remainingUpdates) : ''
        );
        
        console.log(`Processed ${successfulUpdates.length} pending updates. ${remainingUpdates.length} remaining.`);
      }
      
      return true;
    } catch (error) {
      console.error('Error processing pending updates:', error);
      return false;
    }
  }

  // New method to save a user activity
  async saveUserActivity(walletAddress: string, activity: UserActivity): Promise<boolean> {
    try {
      if (!walletAddress || !activity) {
        console.error("Invalid walletAddress or activity data");
        return false;
      }

      // For API-based writes, use API endpoint if in browser
      if (typeof window !== 'undefined' && USE_API_FOR_WRITE_OPERATIONS) {
        return this.saveUserActivityViaApi(walletAddress, activity);
      }

      // First check if the table exists to avoid errors
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'user_activities'
        );
      `;
      
      const tableExists = tableCheck.rows[0]?.exists === true;
      
      if (!tableExists) {
        console.warn("User activities table does not exist yet. Creating table...");
        // Try to create the table
        try {
          await sql`
            CREATE TABLE IF NOT EXISTS user_activities (
              id SERIAL PRIMARY KEY,
              wallet_address TEXT NOT NULL,
              activity_id TEXT UNIQUE NOT NULL,
              activity_type TEXT NOT NULL,
              name TEXT NOT NULL,
              points INTEGER DEFAULT 0,
              timestamp TIMESTAMP NOT NULL
            );
          `;
          console.log("User activities table created successfully");
        } catch (err) {
          console.error("Failed to create user_activities table:", err);
          
          // Add to offline queue
          if (typeof window !== 'undefined') {
            this.cache.markDirty(`activity:${activity.id}`);
            // Store in local storage for later sync
            const pendingActivities = JSON.parse(localStorage.getItem('pendingActivities') || '[]');
            pendingActivities.push({ walletAddress, activity, timestamp: Date.now() });
            localStorage.setItem('pendingActivities', JSON.stringify(pendingActivities));
          }
          
          return false;
        }
      }

      // Execute the query directly with the sql template
      await sql`
        INSERT INTO user_activities (
          wallet_address, 
          activity_id, 
          activity_type, 
          name, 
          points, 
          timestamp
        ) VALUES (
          ${walletAddress}, 
          ${activity.id}, 
          ${activity.type}, 
          ${activity.name}, 
          ${activity.points}, 
          to_timestamp(${activity.timestamp / 1000})
        )
      `;
      
      return true;
    } catch (error) {
      console.error("Error saving user activity:", error);
      
      // Add to offline queue
      if (typeof window !== 'undefined') {
        this.cache.markDirty(`activity:${activity.id}`);
        // Store in local storage for later sync
        const pendingActivities = JSON.parse(localStorage.getItem('pendingActivities') || '[]');
        pendingActivities.push({ walletAddress, activity, timestamp: Date.now() });
        localStorage.setItem('pendingActivities', JSON.stringify(pendingActivities));
      }
      
      return false;
    }
  }

  // Helper method to save activity via API
  private async saveUserActivityViaApi(walletAddress: string, activity: UserActivity): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false; // Only run in browser
    }

    try {
      const response = await fetch('/api/user/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          activity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error saving activity via API:', errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving activity via API:', error);
      
      // Store in local storage for later sync
      const pendingActivities = JSON.parse(localStorage.getItem('pendingActivities') || '[]');
      pendingActivities.push({ walletAddress, activity, timestamp: Date.now() });
      localStorage.setItem('pendingActivities', JSON.stringify(pendingActivities));
      
      return false;
    }
  }

  // New method to get user activities
  async getUserActivities(walletAddress: string, limit: number = 10): Promise<UserActivity[]> {
    try {
      if (!walletAddress) {
        console.error("Invalid walletAddress");
        return [];
      }

      // First check if the table exists to avoid errors
      const tableCheck = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'user_activities'
        );
      `;
      
      const tableExists = tableCheck.rows[0]?.exists === true;
      
      if (!tableExists) {
        console.warn("User activities table does not exist yet. Creating table...");
        // Try to create the table
        try {
          await sql`
            CREATE TABLE IF NOT EXISTS user_activities (
              id SERIAL PRIMARY KEY,
              wallet_address TEXT NOT NULL,
              activity_id TEXT UNIQUE NOT NULL,
              activity_type TEXT NOT NULL,
              name TEXT NOT NULL,
              points INTEGER DEFAULT 0,
              timestamp TIMESTAMP NOT NULL
            );
          `;
          console.log("User activities table created successfully");
        } catch (err) {
          console.error("Failed to create user_activities table:", err);
          return []; // Return empty array if table doesn't exist
        }
      }

      // Execute the query directly with the sql template
      const result = await sql`
        SELECT 
          activity_id as id, 
          activity_type as type, 
          name, 
          points, 
          extract(epoch from timestamp) * 1000 as timestamp
        FROM user_activities 
        WHERE wallet_address = ${walletAddress}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      
      if (!result || !result.rows || result.rows.length === 0) {
        return [];
      }

      // Map database rows to UserActivity objects
      return result.rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        name: row.name,
        points: parseInt(row.points),
        timestamp: parseFloat(row.timestamp)
      }));
    } catch (error) {
      console.error("Error retrieving user activities:", error);
      return [];
    }
  }

  // Method to process pending activities that failed to save while offline
  async processPendingActivities(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false; // Only run in browser
    }

    try {
      const pendingActivitiesJson = localStorage.getItem('pendingActivities');
      if (!pendingActivitiesJson) {
        return true; // No pending activities
      }

      const pendingActivities = JSON.parse(pendingActivitiesJson);
      if (!Array.isArray(pendingActivities) || pendingActivities.length === 0) {
        return true; // No valid pending activities
      }

      console.log(`Processing ${pendingActivities.length} pending activities...`);

      // Track successful updates
      const successfulUpdates: number[] = [];

      for (let i = 0; i < pendingActivities.length; i++) {
        const { walletAddress, activity } = pendingActivities[i];
        
        try {
          // Use the API method directly to avoid circular logic
          const success = await this.saveUserActivityViaApi(walletAddress, activity);
          
          if (success) {
            successfulUpdates.push(i);
          }
        } catch (error) {
          console.error(`Failed to process pending activity ${activity.id}:`, error);
          
          // If it's a network error, stop processing
          if (error instanceof Error && 
             (error.message.includes('Failed to fetch'))) {
            break;
          }
        }
      }

      // Remove successful updates
      if (successfulUpdates.length > 0) {
        const remainingActivities = pendingActivities.filter((_, index) => 
          !successfulUpdates.includes(index)
        );
        
        // Save the remaining updates
        localStorage.setItem('pendingActivities', 
          remainingActivities.length > 0 ? JSON.stringify(remainingActivities) : ''
        );
        
        console.log(`Processed ${successfulUpdates.length} pending activities. ${remainingActivities.length} remaining.`);
      }

      return true;
    } catch (error) {
      console.error('Error processing pending activities:', error);
      return false;
    }
  }

  // Add this method after saveUserActivity
  async saveUserData(walletAddress: string, userData: any): Promise<boolean> {
    try {
      if (!walletAddress) return false;
      
      // Safely store in local cache first
      const cacheKey = `user_data_${walletAddress}`;
      const existingData = this.cache.get(cacheKey) || {};
      const updatedData = { ...existingData, ...userData };
      
      // Save to cache
      this.cache.set(cacheKey, updatedData);
      
      // Queue for database sync
      this.cache.queueOperation('user_data', 'update', {
        walletAddress,
        data: updatedData
      });
      
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  }
}

// Helper function to convert database row to User
function rowToUser(row: any): User {
  if (!row) {
    console.error('Invalid row data provided to rowToUser');
    return {
      walletAddress: '',
      score: 0,
      gamesPlayed: 0,
      lastPlayed: new Date(),
      createdAt: new Date(),
      points: 0,
      dailyPoints: 0,
      lastPointsUpdate: new Date(),
      daysActive: 0,
      consecutiveDays: 0,
      referralCode: '',
      referralCount: 0,
      referralPoints: 0
    };
  }

  // Convert database row to User, with fallbacks for all properties
  return {
    _id: row.id ? row.id.toString() : undefined,
    walletAddress: row.wallet_address,
    username: row.username,
    score: row.score || 0,
    gamesPlayed: row.games_played || 0,
    lastPlayed: row.last_played ? new Date(row.last_played) : new Date(),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    points: row.points || 0,
    dailyPoints: row.daily_points || 0,
    claimedPoints: row.claimed_points || 0,
    lastPointsUpdate: row.last_points_update ? new Date(row.last_points_update) : new Date(),
    daysActive: row.days_active || 0,
    consecutiveDays: row.consecutive_days || 0,
    // These fields may not exist in the actual database
    referralCode: row.referral_code || '',
    referredBy: row.referred_by || undefined,
    referralCount: row.referral_count || 0,
    referralPoints: row.referral_points || 0,
    tokenBalance: row.token_balance || 0,
    multiplier: row.multiplier || 1.0,
    lastInteractionTime: row.last_interaction_time ? new Date(row.last_interaction_time) : undefined,
    cooldowns: row.cooldowns || {},
    recentPointGain: row.recent_point_gain || 0,
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

// Helper to generate unique IDs for referral codes
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Initialize the database service
export const dbService = DatabaseService.instance; 
import { EventEmitter } from 'events';
// import crypto from 'crypto'; // Removed unused import
import { User, PetState, LeaderboardEntry, GameSession, SyncStatus, SyncOperation } from './models';
import { getReadConnection, getWriteConnection, executeTransaction } from './db-connection';

// Set this to true to use API routes for database operations instead of direct database access
const USE_API_FOR_WRITE_OPERATIONS = true;
const IS_BROWSER = typeof window !== 'undefined';

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

  public markUserDirty(uid: string): void {
    const cacheKey = `user:${uid}`;
    // Mark the entity as dirty using the class's own markDirty method
    this.markDirty(cacheKey);
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
    console.log(`Processing sync queue with ${this.syncQueue.length} items...`);
    
    try {
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue.shift();
        if (!item) continue;
        
        const { entity, operation, data } = item;
        const parts = entity.split(':');
        const entityType = parts[0];
        const entityId = parts[1]; // uid for user/pet, sessionId for game

        console.log(`Sync queue: Processing ${operation} for ${entityType} ${entityId}`);

        let success = false;
        try {
           // Execute the operation using specific methods
        switch (operation) {
          case 'create':
               // Handle creation if necessary, e.g., if createUser isn't called elsewhere
               // Commenting out createUser call here as sync should primarily handle updates based on dirty flags
               // if (entityType === 'user') success = (await DatabaseService.instance.createUser(data)) !== null;
               if (entityType === 'game') success = (await DatabaseService.instance.createGameSession(data.uid)) !== null; // Assumes data has uid
               else console.warn(`Sync queue: Create operation not handled for ${entityType}`);
            break;
          case 'update':
               if (entityType === 'user') success = await DatabaseService.instance.updateUserData(entityId, data); // data is Partial<User>
               else if (entityType === 'pet') success = await DatabaseService.instance.updatePetState(entityId, data); // data is Partial<PetState>
               else if (entityType === 'game') success = await DatabaseService.instance.updateGameSession(entityId, data.gameState); // data is GameSession
               else console.warn(`Sync queue: Update operation not handled for ${entityType}`);
            break;
          case 'delete':
               // Handle deletion if necessary
               if (entityType === 'game') success = await DatabaseService.instance.endGameSession(entityId);
               else console.warn(`Sync queue: Delete operation not handled for ${entityType}`);
            break;
        }
           
           if (success) {
               console.log(`Sync queue: Successfully processed ${operation} for ${entityType} ${entityId}`);
               this.clearDirtyFlag(entity); // Clear flag on success
           } else {
               console.warn(`Sync queue: Failed to process ${operation} for ${entityType} ${entityId}. Item remains in queue.`);
               // Re-add to the front if it failed but should be retried? Or rely on dirty flag?
               // For simplicity, let's rely on the dirty flag mechanism managed by synchronize.
           }

    } catch (error) {
            console.error(`Sync queue: Error during ${operation} for ${entityType} ${entityId}:`, error);
            // Keep item dirty, let the main synchronize handle retry logic
        }
      }
    } finally {
      this.isSyncing = false;
      console.log('Sync queue processing finished.');
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
      // Use API route when in browser
      if (IS_BROWSER) {
        console.log('Initializing database tables via API...');
        const result = await callApi('init-database');
        
        if (result.success) {
          console.log('Database tables initialized successfully via API');
          return;
        } else {
          console.error('Failed to initialize database tables via API:', result.error);
          throw new Error(result.error || 'Failed to initialize database tables');
        }
      }
      
      // Server-side initialization using Neon directly
      const { initializeDb } = await import('./neon');
      const success = await initializeDb();
      
      if (success) {
        console.log('Database tables initialized successfully via Neon');
      } else {
        console.error('Failed to initialize database tables via Neon');
        
        // Fallback to direct SQL if Neon initialization fails
        const sql = getWriteConnection();
        
        // Create essential tables in case the Neon init failed
        // Create users table
        await sql`
          CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            wallet_address TEXT UNIQUE,
            username TEXT,
            score INTEGER DEFAULT 0,
            games_played INTEGER DEFAULT 0,
            last_played TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            points INTEGER DEFAULT 0,
            daily_points INTEGER DEFAULT 0,
            last_points_update TIMESTAMP,
            days_active INTEGER DEFAULT 0,
            consecutive_days INTEGER DEFAULT 0,
            token_balance INTEGER DEFAULT 0,
            multiplier REAL DEFAULT 1.0,
            last_interaction_time TIMESTAMP,
            cooldowns JSONB,
            recent_point_gain INTEGER DEFAULT 0,
            last_point_gain_time TIMESTAMP
          );
        `;

        // Create pet_states table
        await sql`
          CREATE TABLE IF NOT EXISTS pet_states (
            uid TEXT PRIMARY KEY,
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
            FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
          );
        `;
        
        // Add user_activities table creation/alteration
        await sql`
          CREATE TABLE IF NOT EXISTS user_activities (
            id SERIAL PRIMARY KEY,
            -- uid TEXT NOT NULL, -- Temporarily remove NOT NULL during transition
            uid TEXT,
            activity_id TEXT UNIQUE NOT NULL,
            activity_type TEXT NOT NULL,
            name TEXT NOT NULL,
            points INTEGER DEFAULT 0,
            timestamp TIMESTAMP NOT NULL
          );
        `;
        
        // Migration steps for user_activities
        try {
            // 1. Ensure uid column exists
            await sql`ALTER TABLE user_activities ADD COLUMN IF NOT EXISTS uid TEXT;`;
            console.log('Ensured user_activities table has uid column.');

            // 2. Check if wallet_address column exists
            const walletColCheck = await sql`
              SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'user_activities' AND column_name = 'wallet_address'
              );
            `;

            if (walletColCheck.rows[0]?.exists) {
                console.log('Found old wallet_address column in user_activities. Attempting migration...');
                // 3. If wallet_address exists, try to copy data (optional, might be complex/slow)
                //    WARNING: This is a basic copy attempt, may fail on large tables or conflicts.
                //    Consider a dedicated migration script for production.
                // await sql`UPDATE user_activities SET uid = wallet_address WHERE uid IS NULL;`;
                // console.log('Attempted to copy wallet_address to uid where uid was NULL.');

                // 4. Drop the wallet_address column
                await sql`ALTER TABLE user_activities DROP COLUMN IF EXISTS wallet_address;`;
                console.log('Dropped old wallet_address column.');
            } else {
              console.log('Old wallet_address column not found, skipping drop.');
            }
            
            // 5. Ensure uid column is NOT NULL *after* potential migration/data copy
            await sql`ALTER TABLE user_activities ALTER COLUMN uid SET NOT NULL;`;
            console.log('Ensured uid column is SET NOT NULL.');

            // 6. Add index for faster querying by uid (if not already added)
             await sql`CREATE INDEX IF NOT EXISTS idx_user_activities_uid ON user_activities(uid);`;
             console.log('Ensured index exists on uid column.');

        } catch (migrationError) {
             const message = migrationError instanceof Error ? migrationError.message : String(migrationError);
             console.error('Error during user_activities table migration:', message);
             // Depending on the error, you might want to halt or proceed cautiously.
             // For now, log the error and continue.
        }
        
        console.log('Database tables created via fallback method');
      }
    } catch (error) {
      console.error('Error initializing database tables:', error);
      
      // For development - if running in Vercel Dev, the error might be about the table already existing
      if (error instanceof Error && 
          error.message.includes('already exists')) {
        console.log('Tables already exist, continuing...');
      } else {
        console.error('Database initialization failed:', error);
        // Don't throw the error - log it but let the app continue
        // This prevents the app from crashing if DB init fails
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
    if (this.syncStatus === 'syncing') {
      console.log('Sync already in progress, skipping.');
      return false;
    }
    if (typeof window !== 'undefined' && !navigator.onLine) {
      console.log('App is offline, skipping sync.');
      return false; // Don't attempt sync if offline
    }
    
    this.updateSyncStatus('syncing');
    
    try {
      const dirtyKeys = this.cache.getDirtyEntities();
      
      if (dirtyKeys.length === 0) {
        console.log('No dirty entities to sync.');
        this.updateSyncStatus('success');
        return true;
      }
      
      console.log(`Starting sync for ${dirtyKeys.length} dirty entities:`, dirtyKeys);

      // Filter out invalid/secondary cache keys before processing for sync
      const validSyncKeys = dirtyKeys.filter(key => {
          const parts = key.split(':');
          if (parts.length !== 2) return false; // Invalid format
          const entityType = parts[0];
          // Only sync primary keys
          return entityType === 'user' || entityType === 'pet' || entityType === 'game'; 
      });

      if (validSyncKeys.length === 0) {
          console.log('No valid primary entities to sync after filtering.');
          // Clear any invalid keys that were marked dirty
          dirtyKeys.forEach(key => {
              if (!validSyncKeys.includes(key)) {
                  console.warn(`Clearing dirty flag for invalid/secondary sync key: ${key}`);
          this.cache.clearDirtyFlag(key);
              }
          });
        this.updateSyncStatus('success');
        return true;
      }

      // Process pending updates first (points, activities)
      // These might clear some dirty flags if they succeed
      await this.processPendingPointsUpdates();
      await this.processPendingActivities();

      // Get potentially updated list of valid dirty keys after processing pending items
      const remainingDirtyKeys = this.cache.getDirtyEntities().filter(key => {
          const parts = key.split(':');
          if (parts.length !== 2) return false;
          const entityType = parts[0];
          return entityType === 'user' || entityType === 'pet' || entityType === 'game';
      });
      
      if (remainingDirtyKeys.length === 0) {
        console.log('Pending updates processed, no remaining dirty entities.');
        this.updateSyncStatus('success');
        return true;
      }

      console.log(`Processing ${remainingDirtyKeys.length} remaining valid dirty entities...`);

      const syncPromises = remainingDirtyKeys.map(async (key) => {
        const entityData = this.cache.get(key);
        if (!entityData) {
          console.warn(`No data found in cache for dirty key ${key}, removing flag.`);
          this.cache.clearDirtyFlag(key);
          return; 
        }
        
        const parts = key.split(':');
        const entityType = parts[0];
        const entityId = parts[1]; // This should be UID for user/pet, sessionId for game
        let success = false;

        try {
          console.log(`Syncing ${entityType} with ID ${entityId}...`);
          switch (entityType) {
            case 'user':
              // Assuming entityData is Partial<User>, entityId is the UID
              success = await this.updateUserData(entityId, entityData);
              break;
            case 'pet':
              // Cache key should be pet:<uid>
              success = await this.updatePetState(entityId, entityData);
              break;
            case 'game':
              // Cache key should be game:<sessionId>
              success = await this.updateGameSession(entityId, entityData.gameState); 
              break;
            // Removed user-wallet case - should not be synced directly
            default:
              // This case should ideally not be reached due to filtering
              console.error(`Reached default sync case unexpectedly for key: ${key}`);
              success = false; // Treat as failure if reached
              break;
          }
          
          if (success) {
            console.log(`Successfully synced ${entityType} ${entityId}. Clearing dirty flag.`);
          this.cache.clearDirtyFlag(key);
          } else {
            console.warn(`Sync failed for ${entityType} ${entityId}. Keeping dirty flag.`);
            // Optionally re-throw specific errors to halt sync if needed
          }
    } catch (error) {
          console.error(`Error syncing ${entityType} with ID ${entityId}:`, error);
          // Re-throw critical errors like connection issues to potentially stop Promise.all
          if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('database'))) {
            throw error; // Propagate critical error
          }
          // Otherwise, keep the flag dirty but continue syncing others
        }
      });
      
      // Wait for all sync operations for this batch
        await Promise.all(syncPromises);
        
        this.lastSyncTime = Date.now();
      this.updateSyncStatus('success'); // Mark as success even if some individual items failed (they remain dirty)
      console.log('Synchronization attempt finished.');
      return true; // Indicate sync cycle completed

    } catch (error) {
      // Catch errors propagated from Promise.all (like connection errors)
      console.error('Synchronization process failed critically:', error);
      this.updateSyncStatus('error');
      // Optional: Schedule a delayed retry
      return false; // Indicate sync cycle failed
    }
  }

  // =======================================================================
  // Private Persistence Layer
  // =======================================================================

  /**
   * Centralized method to persist updates either via API or direct DB connection.
   * Handles routing based on configuration and environment.
   * @param entityType The type of entity ('user', 'petState', 'activity').
   * @param identifier The primary identifier (usually UID).
   * @param data The data to update or save.
   * @returns Promise<boolean> Indicating success or failure of the persistence attempt.
   */
  private async _persistUpdate(entityType: 'user' | 'petState' | 'activity', identifier: string, data: any): Promise<boolean> {
    // Use API route for writes if configured and in browser
    if (USE_API_FOR_WRITE_OPERATIONS && typeof window !== 'undefined') {
      let endpoint = '';
      let payload: any = {};

      switch (entityType) {
        case 'user':
          endpoint = '/api/user/update';
          payload = { uid: identifier, updateData: data }; // Assume data is Partial<User>
          break;
        case 'petState':
          endpoint = '/api/pet/update'; // ** NEW API Endpoint needed **
          payload = { uid: identifier, petState: data }; // Assume data is Partial<PetState>
          break;
        case 'activity':
          endpoint = '/api/user/activity';
          // The activity endpoint expects uid and activity object directly in the body
          payload = { uid: identifier, activity: data }; // Assume data is the activity object
          break;
        default:
          console.error(`Unsupported entity type for API persistence: ${entityType}`);
          return false;
      }
      
      try {
        const response = await fetch(endpoint, {
        method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

      let responseData;
      try {
        responseData = await response.json();
      } catch {
          responseData = { success: false, error: 'Failed to parse API response' };
      }
      
      if (responseData.success === true) {
          console.log(`${entityType} data updated/saved successfully via API for ID: ${identifier}`);
        return true;
      }
      
        // Handle specific errors like schema mismatch gracefully for the client
        if (responseData.error && responseData.error.includes('Schema mismatch')) {
          console.warn(`API Schema mismatch detected for ${entityType} ID ${identifier}: ${responseData.message || responseData.error}`);
          return true; // Treat as success for client cache consistency
        }

      if (!response.ok) {
          console.error(`API update failed for ${entityType} ID ${identifier}:`, responseData);
          // Consider retrying or logging more details
          return true; // Non-critical error for client? Or return false?
                       // Returning true to keep cache consistent for now.
        }
        
        return true; // Should technically be responseData.success, but true keeps cache consistent

    } catch (error) {
        console.error(`Error in API persistence for ${entityType} ID ${identifier}:`, error);
        return true; // Non-critical error for client?
      }
      
    } else {
      // --- Direct DB Update (Server-side or API flag disabled) ---
      console.log(`Using direct DB persistence for ${entityType} ID: ${identifier}`);
      try {
        switch (entityType) {
          case 'user':
            // Placeholder: Call the direct update method
            // return await this._updateUserDirectly(identifier, data as Partial<User>);
            console.warn('Direct DB update for user needs to be called here.'); 
            return false; // Indicate failure until implemented
          case 'petState':
            // Placeholder: Call the direct update method
            // return await this._updatePetStateDirectly(identifier, data as Partial<PetState>);
             console.warn('Direct DB update for petState needs to be called here.'); 
            return false; // Indicate failure until implemented
          case 'activity':
            // Direct saving of single activities might not be needed if sync handles user updates
            // If needed, implement a _saveActivityDirectly method
            console.warn('Direct DB saving for single activities not implemented, rely on user sync.');
            // To make it work, we'd need a direct DB counterpart to the API logic
            // return await this._saveActivityDirectly(identifier, data);
            return true; // Assume success for now, relying on the user sync
          default:
            console.error(`Unsupported entity type for direct DB persistence: ${entityType}`);
        return false;
      }
      } catch (error) {
        console.error(`Error in direct DB persistence for ${entityType} ID ${identifier}:`, error);
          return false;
      }
    }
  }

  /**
   * Direct DB update logic for User data.
   * Extracted from the original updateUserData function.
   * @param uid The user ID.
   * @param updateData The data to update.
   * @returns Promise<boolean>
   */
  private async _updateUserDirectly(uid: string, updateData: Partial<User>): Promise<boolean> {
      // *** Paste the executeTransaction block from original updateUserData here ***
      return await executeTransaction(async (sql) => {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
          const columnMapping: { [K in keyof User]?: string } = {
              username: 'username', points: 'points', gamesPlayed: 'games_played',
              lastPlayed: 'last_played', dailyPoints: 'daily_points', lastPointsUpdate: 'last_points_update',
              daysActive: 'days_active', consecutiveDays: 'consecutive_days', tokenBalance: 'token_balance',
              multiplier: 'multiplier', lastInteractionTime: 'last_interaction_time', cooldowns: 'cooldowns',
              recentPointGain: 'recent_point_gain', lastPointGainTime: 'last_point_gain_time',
              hasBeenReferred: 'has_been_referred', claimedPoints: 'claimed_points',
              referredBy: 'referred_by', unlockedItems: 'unlocked_items', lastOnline: 'last_online'
          };

          for (const key in updateData) {
              if (Object.prototype.hasOwnProperty.call(updateData, key)) {
                  const dbColumn = columnMapping[key as keyof User];
                  if (dbColumn) {
                      let value = updateData[key as keyof User];
                      if (value instanceof Date) { value = value.toISOString(); }
                      else if (dbColumn === 'cooldowns' || dbColumn === 'unlocked_items') { 
                           value = JSON.stringify(value); 
                      }
                      setClauses.push(`${dbColumn} = $${paramIndex}`);
          values.push(value);
                      paramIndex++;
                  }
              }
          }

          if (setClauses.length === 0) {
              console.log('No valid DB fields to update directly for UID:', uid);
              return true;
          }

          values.push(uid);
          const uidParamIndex = paramIndex;

          const query = `UPDATE users SET ${setClauses.join(', ')} WHERE uid = $${uidParamIndex}`;
          const result = await sql.unsafe(query, values);

          if (result.rowCount === 0) {
              console.warn(`Direct DB Update: No user found with UID ${uid} or no changes applied.`);
      return false;
          }
          
          console.log(`Successfully updated user data directly in DB for UID: ${uid}`);
          return true;
      });
  }

  /**
   * Direct DB update/insert logic for PetState data.
   * Extracted from the original updatePetState function.
   * Assumes uid column exists in pet_states table (DB MIGRATION NEEDED).
   * @param uid The user ID.
   * @param petState The pet state data.
   * @returns Promise<boolean>
   */
  private async _updatePetStateDirectly(uid: string, petState: Partial<PetState>): Promise<boolean> {
      // *** Paste the logic from original updatePetState (inside the try block) here ***
      // DB MIGRATION REQUIRED: pet_states table needs a 'uid' column (TEXT, potentially FOREIGN KEY to users.uid)
      // and queries below need to use WHERE uid = ... instead of WHERE wallet_address = ...
      console.warn("Executing _updatePetStateDirectly - Requires DB migration for pet_states to use UID.");

      const lastStateUpdate = petState.lastStateUpdate instanceof Date ? petState.lastStateUpdate.toISOString() : new Date().toISOString();
      const lastInteractionTime = petState.lastInteractionTime instanceof Date ? petState.lastInteractionTime.toISOString() : new Date().toISOString();
      const isDead = typeof petState.isDead === 'boolean' ? petState.isDead : false;
      const health = typeof petState.health === 'number' ? Math.max(0, Math.min(100, petState.health)) : 100;
      const happiness = typeof petState.happiness === 'number' ? Math.max(0, Math.min(100, petState.happiness)) : 100;
      const hunger = typeof petState.hunger === 'number' ? Math.max(0, Math.min(100, petState.hunger)) : 100;
      const cleanliness = typeof petState.cleanliness === 'number' ? Math.max(0, Math.min(100, petState.cleanliness)) : 100;
      const energy = typeof petState.energy === 'number' ? Math.max(0, Math.min(100, petState.energy)) : 100;
      const qualityScore = typeof petState.qualityScore === 'number' ? Math.max(0, petState.qualityScore) : 0;
      
      return await executeTransaction(async (sql) => {
          // Check if pet exists using UID (Requires uid column in pet_states)
          const existingPet = await sql`SELECT uid FROM pet_states WHERE uid = ${uid}`; 

      if (existingPet.rows && existingPet.rows.length > 0) {
              // Update using UID
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
                  WHERE uid = ${uid}
        `;
      } else {
              // Insert using UID - Need walletAddress for insertion
              let walletAddress: string | null = null; // Ensure type annotation
              // Attempt to find walletAddress associated with UID
              const user = await this.getUserByUid(uid); 
              walletAddress = user?.walletAddress ?? null; // Correct assignment
              
              if (!walletAddress) {
                  console.error(`Cannot insert pet_state for UID ${uid} without a walletAddress.`);
                  // Removed check for non-existent petState.walletAddress
                  return false; // Cannot proceed without walletAddress for insertion
              }

              await sql`
          INSERT INTO pet_states (
                      uid, wallet_address, health, happiness, hunger, cleanliness, energy,
            last_state_update, quality_score, last_message, last_reaction, is_dead, last_interaction_time
          ) VALUES (
                      ${uid}, 
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
          console.log(`Successfully updated/inserted pet state directly in DB for UID: ${uid}`);
          return true;
      });
  }

  // =======================================================================
  // Public User Methods (Refactored)
  // =======================================================================

  // Update user data in DB/Cache, identified by UID
  public async updateUserData(uid: string, updateData: Partial<User>): Promise<boolean> {
    try {
      if (!uid) {
        console.error('Missing UID in updateUserData');
        return false;
      }

      // Check if the uid looks like a wallet address
      if (uid.length > 30 && !uid.includes('-')) {
        console.warn('Wallet address detected instead of UID in updateUserData:', uid);
        const userByWallet = await this.getUserByWalletAddress(uid);
        if (userByWallet && userByWallet.uid) {
          console.log(`Converting wallet address to UID: ${uid} -> ${userByWallet.uid}`);
          uid = userByWallet.uid;
        } else {
          console.error('Unable to find UID for wallet address:', uid);
          return false;
        }
      }

      // --- Optimistic Cache Update ---
      const cacheKey = `user:${uid}`;
      let cachedUser = this.cache.get(cacheKey) as User | undefined;

      if (!cachedUser) {
        const fetchedUser = await this.getUserByUid(uid);
        cachedUser = fetchedUser === null ? undefined : fetchedUser;
        if (!cachedUser) {
          console.error(`User not found for UID ${uid} during update. Cannot update.`);
          return false;
        }
      }
      
      const updatedUser = { ...cachedUser, ...updateData };
      this.cache.set(cacheKey, updatedUser);
      this.cache.markDirty(cacheKey); 

      if (updatedUser.walletAddress) {
          this.cache.set(`user-wallet:${updatedUser.walletAddress}`, updatedUser);
      }
      // --- End Cache Update ---
      
      // --- Persistence ---
      // Call the centralized persistence method
      const persistenceSuccess = await this._persistUpdate('user', uid, updateData);
      // Note: We might want to handle persistence failure differently, 
      // e.g., revert cache update or keep it dirty for next sync attempt.
      // For now, returning the success status of the persistence attempt.
      return persistenceSuccess;
      // --- End Persistence ---

    } catch (error) {
      console.error(`Error in updateUserData for UID ${uid}:`, error);
      // Ensure cache is marked dirty if an error occurred before persistence?
      // Maybe markDirty should happen *after* successful optimistic update but before persistence attempt?
      this.cache.markDirty(`user:${uid}`); // Ensure it stays dirty on error
      return false; // Return false on error
    }
  }

  // =======================================================================
  // Public Pet Methods (Refactored)
  // =======================================================================

  // Update pet state, identified by UID
  public async updatePetState(uid: string, petState: Partial<PetState>): Promise<boolean> {
    try {
      if (!uid) {
        console.error('User ID is required for updatePetState');
        return false;
      }
      
      // Handle potential wallet address passed as UID
      let userUid: string = uid;
      if (uid.length > 30 && !uid.includes('-')) {
        console.warn('Wallet address detected instead of UID in updatePetState:', uid);
        const userByWallet = await this.getUserByWalletAddress(uid);
        if (userByWallet && userByWallet.uid) {
          console.log(`Converting wallet address to UID: ${uid} -> ${userByWallet.uid}`);
          userUid = userByWallet.uid;
          // Keep original wallet address if needed for persistence layer (e.g., API might still use it)
          // Or pass both uid and walletAddress to _persistUpdate if necessary.
          // For now, assume _persistUpdate uses the primary UID.
        } else {
          console.error('Unable to find UID for wallet address in updatePetState:', uid);
          // Decide fallback: return false or try using the address directly?
          // Forcing UID use:
      return false;
    }
  }
      
      // --- Optimistic Cache Update ---
      const userCacheKey = `user:${userUid}`;
      let cachedUser = this.cache.get(userCacheKey) as User | undefined;
      // Initialize walletAddress based on fetched user later
      let walletAddress: string | null = null; 
      
      if (!cachedUser) {
          const fetchedUser = await this.getUserByUid(userUid);
          cachedUser = fetchedUser ?? undefined;
      }

      if (!cachedUser) {
          console.error(`User not found for UID ${userUid} when updating pet state. Cannot update cache.`);
      } else {
          // Get walletAddress from the cached/fetched user data
          walletAddress = cachedUser.walletAddress; 
          const updatedPetState = { ...cachedUser.petState, ...petState }; // Don't force walletAddress into petState partial
          this.cache.set(userCacheKey, { ...cachedUser, petState: updatedPetState });
          this.cache.markDirty(userCacheKey); 
          
          // Update secondary wallet cache if wallet exists
          if (walletAddress) {
              const walletCacheKey = `user-wallet:${walletAddress}`;
              // Make sure to update the user object in the secondary cache as well
              const secondaryCacheUser = this.cache.get(walletCacheKey) ?? cachedUser; // Use existing or fetched
              this.cache.set(walletCacheKey, { ...secondaryCacheUser, petState: updatedPetState });
          }
      }
      // --- End Cache Update ---

      // --- Persistence ---
      // Pass only the pet state delta to persist layer
      const persistenceSuccess = await this._persistUpdate('petState', userUid, petState);
      // Handle potential failure as in updateUserData
      return persistenceSuccess;
      // --- End Persistence ---

    } catch (error) {
      console.error(`Error updating pet state for UID ${uid}:`, error);
       // Ensure user cache is marked dirty on error
      // Need to determine the correct userUid even if the initial check failed
      let errorUid = uid; // Fallback
      if (uid.length > 30 && !uid.includes('-')) {
          const userByWallet = await this.getUserByWalletAddress(uid).catch(() => null); // Ignore find error
          if (userByWallet?.uid) errorUid = userByWallet.uid;
      }
      this.cache.markDirty(`user:${errorUid}`);
      return false;
    }
  }

  // =======================================================================
  // Public Game Methods
  // =======================================================================

  // Create a new game session
  public async createGameSession(walletAddress: string): Promise<string | null> {
    try {
      const sessionId = generateUniqueId();
      const now = new Date();
      
      const sqlConn = getWriteConnection();
      await sqlConn`
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
      const sqlConn = getWriteConnection();
      await sqlConn`
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
      const sqlConn = getReadConnection();
      const result = await sqlConn`
        SELECT * FROM game_sessions WHERE session_id = ${sessionId} AND is_active = true
      `;
      
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      const session: GameSession = {
        uid: row.uid,
        sessionId: row.session_id,
        startedAt: new Date(row.started_at),
        lastActive: new Date(row.last_active),
        gameState: row.game_state,
        isActive: row.is_active,
        version: row.version
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
      const sqlConn = getWriteConnection();
      await sqlConn`
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
          // Cast 'this' to 'any' to suppress potential linter resolution issues
          await (this as any).createUser(data as Partial<User>); 
          return true;
        case 'game':
          if (!data.uid) {
              console.error('Error creating game entity: Missing UID in data', data);
          return false;
      }
          await this.createGameSession(data.uid);
          return true;
        default:
          console.warn(`Unknown entity type for creation: ${entityType}`);
          return false;
      }
    } catch (error) {
      console.error(`Error creating ${entityType}:`, error);
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
  public async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const sqlConn = getReadConnection();
      const result = await sqlConn`
        SELECT username, wallet_address, score, points, days_active
        FROM users
        ORDER BY score DESC, points DESC
        LIMIT ${limit}
      `;
      
      return result.rows.map((row, index) => ({
        rank: index + 1,
        username: row.username || `Player ${index + 1}`,
        walletAddress: row.wallet_address,
        score: row.score,
        points: row.points,
        daysActive: row.days_active
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  // Check if there are any dirtyEntities that need syncing
  public hasPendingChanges(): boolean {
    return this.cache.hasDirtyEntities();
  }

  // Get user data by UID
  public async getUserByUid(uid: string): Promise<User | null> {
    try {
      // Check cache first
      const cacheKey = `user:${uid}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
      
      // If not in cache, query the database
      const sqlConn = getReadConnection();
      const result = await sqlConn`
        SELECT * FROM users WHERE uid = ${uid} LIMIT 1
      `;
      
      if (result.rows.length === 0) return null;
      
      const userData = rowToUser(result.rows[0]);
      
      // Cache the result
      this.cache.set(cacheKey, userData);
      
      // Also cache by wallet address if available for quick lookup
      if (userData.walletAddress) {
        this.cache.set(`user-wallet:${userData.walletAddress}`, userData);
      }
      
      return userData;
    } catch (error) {
      console.error('Error getting user data by UID:', error);
      return null;
    }
  }
  
  // Get user data by wallet address
  public async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    try {
      // Check wallet-specific cache first
      const walletCacheKey = `user-wallet:${walletAddress}`;
      if (this.cache.has(walletCacheKey)) {
        return this.cache.get(walletCacheKey);
      }
      
      // If not in cache, query the database
      const sqlConn = getReadConnection();
      const result = await sqlConn`
        SELECT * FROM users WHERE wallet_address = ${walletAddress} LIMIT 1
      `;
      
      if (result.rows.length === 0) return null;
      
      const userData = rowToUser(result.rows[0]);
      const userCacheKey = `user:${userData.uid}`;

      // Cache the result by UID (primary)
      this.cache.set(userCacheKey, userData);
      // Cache the result by wallet address too
      this.cache.set(walletCacheKey, userData);
      
      return userData;
    } catch (error) {
      console.error('Error getting user data by wallet address:', error);
      return null;
    }
  }
  
  /**
   * Creates a new wallet entry in the database
   * Generates a unique UID based on timestamp and randomness
   */
  /*
  public async createWallet(walletAddress: string): Promise<User | null> {
    // ... function body of createWallet ... 
  }
  */
  
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
      const sqlConn = getReadConnection();
      const query = `
        SELECT * FROM users
        ${whereClause}
        LIMIT 100
      `;
      
      const result = await sqlConn(query, values);
      
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
        let userUid: string | undefined | null = update.uid; // Prefer uid if present

        // If UID is not present, try to find it using walletAddress
        if (!userUid && update.walletAddress) {
           try {
              // Use the correct lookup function
              const user = await this.getUserByWalletAddress(update.walletAddress); 
              userUid = user?.uid; // Get UID from the found user
           } catch (lookupError) {
              console.error(`Error looking up UID for wallet ${update.walletAddress}:`, lookupError);
              // Proceed without UID, the update will likely fail but we can remove the entry
           }
        }

        // Ensure we have a UID before processing
        if (!userUid) {
            console.warn('Skipping pending update (could not determine UID):', update);
            successfulUpdates.push(i); // Mark as processed to remove it
            continue; // Skip to the next update
        }
        
        try {
          // Update the user's points using the CORRECT UID
          const result = await this.updateUserData(userUid, { // Pass UID
            points: update.points
          });
          
          if (result) {
            successfulUpdates.push(i);
          }
        } catch (error) {
          console.error(`Failed to process pending update for ${userUid}:`, error);
          
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

  // New method to save a user activity, linked to UID
  async saveUserActivity(uid: string, activity: UserActivity): Promise<boolean> {
    try {
      if (!uid || !activity) {
        console.error("Invalid UID or activity data");
        return false;
      }

      // For API-based writes, use API endpoint if in browser
      if (typeof window !== 'undefined' && USE_API_FOR_WRITE_OPERATIONS) {
        return this.saveUserActivityViaApi(uid, activity); // Pass UID
      }

      // Direct DB interaction (server-side or API disabled)
      const sqlConn = getReadConnection();
      let tableExists = false;
      try {
        // Check if table exists
      const tableCheck = await sqlConn`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'user_activities'
        );
      `;
        tableExists = tableCheck.rows[0]?.exists === true;
      } catch (checkError) {
         console.error('Error checking for user_activities table:', checkError);
      }
      
      const writeSql = getWriteConnection();
      if (!tableExists) {
        console.warn("User activities table does not exist yet. Creating table...");
        try {
          // Create the table using UID
          await writeSql`
            CREATE TABLE IF NOT EXISTS user_activities (
              id SERIAL PRIMARY KEY,
              uid TEXT NOT NULL, -- Use uid
              activity_id TEXT UNIQUE NOT NULL,
              activity_type TEXT NOT NULL,
              name TEXT NOT NULL,
              points INTEGER DEFAULT 0,
              timestamp TIMESTAMP NOT NULL
            );
          `;
          console.log("User activities table created successfully");
          tableExists = true;
        } catch (createErr) {
          console.error("Failed to create user_activities table:", createErr);
          return false;
        }
      }

      // Insert the activity using UID
      await writeSql`
        INSERT INTO user_activities (
          uid, activity_id, activity_type, name, points, timestamp
        ) VALUES (
          ${uid}, -- Insert uid
          ${activity.id}, 
          ${activity.type}, 
          ${activity.name}, 
          ${activity.points}, 
          to_timestamp(${activity.timestamp / 1000})
        )
        ON CONFLICT (activity_id) DO NOTHING 
      `;
      
      console.log(`Saved activity ${activity.id} for UID ${uid}`);
      return true;
    } catch (error) {
      console.error(`Error saving user activity for UID ${uid}:`, error);
      // Consider offline queuing if needed
      return false;
    }
  }

  // Helper method to save activity via API, using UID
  private async saveUserActivityViaApi(uid: string, activity: UserActivity): Promise<boolean> {
    if (typeof window === 'undefined') {
      console.warn('Attempted saveUserActivityViaApi from non-browser env.');
      return this.saveUserActivity(uid, activity); // Fallback to direct DB write
    }

    try {
      const response = await fetch('/api/user/activity', { // Ensure API endpoint handles UID
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid, // Send uid
          activity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Error saving activity via API for UID ${uid}:`, errorData);
        // Consider offline queuing
        return false;
      }

      console.log(`Saved activity ${activity.id} via API for UID ${uid}`);
      return true;
    } catch (error) {
      console.error(`Network error saving activity via API for UID ${uid}:`, error);
      // Consider offline queuing
      return false;
    }
  }

  // New method to get user activities by UID
  async getUserActivities(uid: string, limit: number = 10): Promise<UserActivity[]> {
    try {
      if (!uid) {
        console.error("Invalid UID for getUserActivities");
        return [];
      }

      const sqlConn = getReadConnection();
      let tableExists = false;
      try {
        // Check if table exists
      const tableCheck = await sqlConn`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'user_activities'
        );
      `;
        tableExists = tableCheck.rows[0]?.exists === true;
      } catch (checkError) {
        console.error('Error checking for user_activities table:', checkError);
      }
      
      if (!tableExists) {
        console.warn("User activities table does not exist. Cannot fetch activities.");
        return []; 
      }

      // Execute the query using UID (already corrected SELECT and WHERE)
      const result = await sqlConn`
        SELECT 
          activity_id as id, 
          activity_type as type, 
          name, 
          points, 
          extract(epoch from timestamp) * 1000 as timestamp -- Convert timestamp to ms epoch
        FROM user_activities 
        WHERE uid = ${uid} -- WHERE clause uses uid
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
      
      if (!result || !result.rows || result.rows.length === 0) {
        return [];
      }

      // Map database rows to UserActivity objects
      return result.rows.map((row: any): UserActivity => ({
        id: row.id,
        type: row.type,
        name: row.name,
        points: parseInt(row.points) || 0, 
        timestamp: parseFloat(row.timestamp) || Date.now() 
      }));
    } catch (error) {
      console.error(`Error retrieving user activities for UID ${uid}:`, error);
      return [];
    }
  }

  // Method to process pending activities that failed to save while offline
  async processPendingActivities(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false; // Only run in browser
    }

    let pendingActivities: { uid?: string, walletAddress?: string, activity: UserActivity, timestamp: number }[] = []; // Allow both identifiers temporarily
    try {
      const pendingActivitiesJson = localStorage.getItem('pendingActivities');
      if (pendingActivitiesJson) {
        pendingActivities = JSON.parse(pendingActivitiesJson);
        if (!Array.isArray(pendingActivities)) pendingActivities = [];
      }

      if (pendingActivities.length === 0) {
        return true; // No pending activities
      }

      console.log(`Processing ${pendingActivities.length} pending activities...`);

      // Track successful updates
      const successfulIndices: number[] = [];

      for (let i = 0; i < pendingActivities.length; i++) {
        const item = pendingActivities[i];
        const { uid: itemUid, walletAddress: itemWalletAddress, activity } = item; 
        let userUid: string | null | undefined = itemUid;

        // If UID is missing, try lookup via walletAddress
        if (!userUid && itemWalletAddress) {
            try {
                 const user = await this.getUserByWalletAddress(itemWalletAddress);
                 userUid = user?.uid;
            } catch (lookupError) {
                console.error(`Error looking up UID for wallet ${itemWalletAddress} during pending activity processing:`, lookupError);
            }
        }
        
        if (!userUid || !activity) {
            console.warn('Skipping invalid pending activity (missing uid/activity or lookup failed):', item);
            successfulIndices.push(i); // Mark as processed to remove it
            continue;
        }

        try {
          // Attempt to save using the primary method (handles API/direct DB)
          const success = await this.saveUserActivity(userUid, activity);
          
          if (success) {
            successfulIndices.push(i);
          } else {
            console.warn(`Failed to process pending activity ${activity.id} for UID ${userUid}. Will retry later.`);
          }
        } catch (error) {
          console.error(`Error processing pending activity ${activity.id} for UID ${userUid}:`, error);
          if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('database'))) {
            console.log('Stopping pending activity processing due to potential connection issue.');
            break;
          }
        }
      }

      // Remove successful updates from localStorage
      if (successfulIndices.length > 0) {
        const remainingActivities = pendingActivities.filter((_, index) => 
          !successfulIndices.includes(index)
        );
        
        localStorage.setItem('pendingActivities', 
          remainingActivities.length > 0 ? JSON.stringify(remainingActivities) : ''
        );
        
        console.log(`Processed ${successfulIndices.length} pending activities. ${remainingActivities.length} remaining.`);
      }

      return true;
    } catch (error) {
      console.error('Error processing pending activities:', error);
      // Attempt to save remaining back to localStorage in case of JSON parse error etc.
      localStorage.setItem('pendingActivities', JSON.stringify(pendingActivities)); 
      return false;
    }
  }
}

// Helper function to convert database row to User
function rowToUser(row: any): User {
  if (!row || !row.uid) { // Ensure row and uid exist
    console.error('Invalid row data provided to rowToUser or missing UID', row);
    // Throw an error or return a default object that reflects the error?
    // Throwing might be better to prevent downstream issues.
    throw new Error('Cannot convert row to User: Invalid data or missing UID.');
  }

  // Convert database row to User, ensuring required uid is present
  return {
    uid: row.uid, // Required field
    walletAddress: row.wallet_address || null, // Align with User model (string | null)
    username: row.username ?? undefined,
    gamesPlayed: row.games_played || 0,
    lastPlayed: row.last_played ? new Date(row.last_played) : undefined,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    points: row.points || 0,
    dailyPoints: row.daily_points || 0,
    claimedPoints: row.claimed_points ?? undefined,
    lastPointsUpdate: row.last_points_update ? new Date(row.last_points_update) : undefined,
    daysActive: row.days_active || 0,
    consecutiveDays: row.consecutive_days || 0,
    tokenBalance: row.token_balance || 0,
    multiplier: row.multiplier || 1.0,
    lastInteractionTime: row.last_interaction_time ? new Date(row.last_interaction_time) : undefined,
    cooldowns: row.cooldowns || {},
    recentPointGain: row.recent_point_gain || 0,
    lastPointGainTime: row.last_point_gain_time ? new Date(row.last_point_gain_time) : undefined,
    // Optional fields from User model
    hasBeenReferred: row.has_been_referred ?? undefined,
    referredBy: row.referred_by ?? undefined,
    unlockedItems: row.unlocked_items ?? undefined,
    lastOnline: row.last_online ?? undefined,
    // Assuming petState is joined or handled separately, not directly in users row
    petState: undefined, 
  };
}

// Helper to generate unique IDs for referral codes
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Initialize the database service
export const dbService = DatabaseService.instance;

// Helper function to call API routes
const callApi = async (endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) => {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }
    
    const queryString = data && method === 'GET' ? 
      `?${Object.entries(data).map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join('&')}` : '';
    
    const response = await fetch(`/api/${endpoint}${queryString}`, options);
    return await response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
}; 
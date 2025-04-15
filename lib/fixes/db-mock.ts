/**
 * Mock database implementation for development environments
 * 
 * This file provides mock implementations of database functions
 * to use during local development when a real database connection
 * is not available.
 */

// Mock SQL function for development
export const createMockSql = () => {
  // Create a basic function that logs and returns empty results
  const mockSql = (...args: any[]) => {
    console.log("[MOCK DB] SQL query:", args[0]);
    return Promise.resolve({ rows: [] });
  };
  
  // Add query method for direct query calls
  mockSql.query = (text: string, params: any[] = []) => {
    console.log("[MOCK DB] SQL query.query:", text, params);
    return Promise.resolve({ rows: [] });
  };
  
  return mockSql;
};

// Mock initialization function
export const mockInitializeDb = async () => {
  console.log("[MOCK DB] Database initialization started (mock)");
  console.log("[MOCK DB] Users table would be created");
  console.log("[MOCK DB] Pet states table would be created");
  console.log("[MOCK DB] User activities table would be created");
  console.log("[MOCK DB] Database tables initialized successfully (mock)");
  return true;
};

// Mock for storing data in memory (for testing)
const inMemoryStore = {
  users: new Map(),
  petStates: new Map(),
  activities: new Map()
};

// Mock DB Service methods
export const mockDatabaseService = {
  // User methods
  getUserData: async (walletAddress: string) => {
    console.log("[MOCK DB] Getting user data for:", walletAddress);
    return inMemoryStore.users.get(walletAddress) || null;
  },
  
  createUser: async (userData: any) => {
    console.log("[MOCK DB] Creating user:", userData);
    const uid = userData.uid || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    inMemoryStore.users.set(userData.walletAddress, { ...userData, uid });
    return uid;
  },
  
  updateUserData: async (walletAddress: string, updateData: any) => {
    console.log("[MOCK DB] Updating user data:", walletAddress, updateData);
    const existingUser = inMemoryStore.users.get(walletAddress) || { walletAddress };
    inMemoryStore.users.set(walletAddress, { ...existingUser, ...updateData });
    return true;
  },
  
  // Pet state methods
  updatePetState: async (walletAddress: string, petState: any) => {
    console.log("[MOCK DB] Updating pet state:", walletAddress, petState);
    inMemoryStore.petStates.set(walletAddress, petState);
    return true;
  },
  
  // Activity methods
  saveUserActivity: async (walletAddress: string, activity: any) => {
    console.log("[MOCK DB] Saving user activity:", walletAddress, activity);
    const activities = inMemoryStore.activities.get(walletAddress) || [];
    activities.unshift(activity);
    inMemoryStore.activities.set(walletAddress, activities);
    return true;
  },
  
  getUserActivities: async (walletAddress: string) => {
    console.log("[MOCK DB] Getting user activities for:", walletAddress);
    return inMemoryStore.activities.get(walletAddress) || [];
  }
};

/**
 * Setup mock database functions
 * Import and call this function in your WalletContext or app initialization
 */
export const setupMockDatabase = () => {
  const isBrowser = typeof window !== 'undefined';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isBrowser && isDevelopment) {
    console.log("Setting up mock database for browser development environment");
    
    // Store references globally if needed
    if (typeof window !== 'undefined') {
      (window as any).__MOCK_DB__ = {
        sql: createMockSql(),
        initializeDb: mockInitializeDb,
        dbService: mockDatabaseService
      };
    }
    
    return true;
  }
  
  return false;
};

export default setupMockDatabase; 
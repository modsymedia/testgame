// Import the mock setup function
import { setupMockDatabase, mockDatabaseService } from './db-mock';

// Set up the mock database if in development
const isMockEnabled = setupMockDatabase();

/**
 * HOW TO USE:
 * 
 * 1. Import this file in your _app.tsx or layout.tsx:
 *    import '@/lib/fixes/setup-mock-db';
 * 
 * 2. Create a .env.local file in your project root with:
 *    DATABASE_URL=postgres://username:password@hostname:port/database
 * 
 * 3. If you need to use the mock database service directly:
 *    import { getMockDbService } from '@/lib/fixes/setup-mock-db';
 *    const mockDb = getMockDbService();
 *    await mockDb.getUserData('wallet-address');
 */

// Export a function to get the mock database service if needed
export const getMockDbService = () => {
  return mockDatabaseService;
};

// Log setup status
if (isMockEnabled) {
  console.log("Mock database setup complete - your app will now use the in-memory database for development");
  console.log("See lib/fixes/setup-mock-db.ts for usage instructions");
}

export default isMockEnabled; 
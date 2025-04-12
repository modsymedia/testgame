// Database initialization script
import { initDatabase } from '../lib/database-schema';

async function main() {
  console.log('Starting database initialization...');
  try {
    const result = await initDatabase();
    if (result) {
      console.log('Database initialization completed successfully');
    } else {
      console.error('Database initialization failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
  process.exit(0);
}

// Run the main function
main(); 
// Database initialization script
import { initDatabase } from '../lib/database-schema';

console.log('Starting database initialization...');

initDatabase()
  .then(() => {
    console.log('Database initialization completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error initializing database:', error);
    process.exit(1);
  }); 
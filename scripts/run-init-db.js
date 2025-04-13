// Script to run database initialization with environment variables
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.development.local
const envPath = path.resolve(__dirname, '../.env.development.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Set environment variables
Object.keys(envConfig).forEach(key => {
  process.env[key] = envConfig[key];
});

console.log('Environment variables loaded');

// Run the database initialization script
try {
  console.log('Running database initialization...');
  execSync('npx tsx init-db.ts', { 
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('Database initialization completed');
} catch (error) {
  console.error('Failed to run database initialization:', error.message);
  process.exit(1);
} 
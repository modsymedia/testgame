// Re-export from neon-init.ts to avoid duplicate initialization
import { sql, initializeDb } from './neon-init';

export { sql, initializeDb };
export default sql; 
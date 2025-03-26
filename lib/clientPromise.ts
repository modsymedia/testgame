/**
 * Bridge module for Next.js API routes to use SQLite
 * This wraps the SQLite client in a Promise to maintain compatibility with the old MongoDB code
 */
import sqliteClient from './sqlite';

// SQLite client is already a Promise-based API, but we wrap it for consistent usage
const clientPromise = Promise.resolve(sqliteClient);

export default clientPromise; 
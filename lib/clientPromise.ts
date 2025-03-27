/**
 * Bridge module for Next.js API routes to use Postgres
 * This wraps the Postgres client in a Promise to maintain compatibility
 */
import postgresClient from './postgres';

// Postgres client wrapper for consistent usage
const clientPromise = Promise.resolve(postgresClient);

export default clientPromise; 
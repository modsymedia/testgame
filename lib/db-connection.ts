import { db, sql } from '@vercel/postgres';

/**
 * Database connection manager for handling pooled and unpooled connections
 * Optimized for serverless environment (Neon + Vercel)
 */
class DBConnectionManager {
  private static instance: DBConnectionManager;
  private isServerless: boolean;
  
  // Connection configurations applied internally by @vercel/postgres
  private readonly connectionConfig = {
    connectionTimeout: 10000, // 10 seconds
    maxUses: 50, // Maximum number of times a connection can be reused
    idleTimeout: 60000, // 60 seconds (how long a connection can remain idle)
  };

  private constructor() {
    // Check if we're in serverless environment (Vercel)
    this.isServerless = process.env.VERCEL === '1';
  }

  /**
   * Gets the singleton instance of the connection manager
   */
  public static getInstance(): DBConnectionManager {
    if (!DBConnectionManager.instance) {
      DBConnectionManager.instance = new DBConnectionManager();
    }
    return DBConnectionManager.instance;
  }

  /**
   * Gets the appropriate SQL executor based on operation type
   * - Read operations use pooled connections (better for parallel reads)
   * - Write operations use unpooled connections (better for longer transactions)
   * 
   * Returns a function that supports both tagged template syntax and 
   * regular query string + params format
   */
  public getConnection(isWriteOperation: boolean = false) {
    if (isWriteOperation && this.isServerless) {
      // For write operations in serverless, use unpooled connection
      return this.getUnpooledConnection();
    } else {
      // For read operations or non-serverless, use pooled connection
      return this.getPooledConnection();
    }
  }

  /**
   * Gets a SQL executor for read queries (pooled)
   */
  public getReadConnection() {
    return this.getPooledConnection();
  }

  /**
   * Gets a SQL executor for write queries (may be unpooled in serverless)
   */
  public getWriteConnection() {
    return this.getConnection(true);
  }

  /**
   * Gets a pooled connection that supports both tagged templates and regular queries
   */
  private getPooledConnection() {
    return this.createQueryExecutor(sql);
  }

  /**
   * Gets an unpooled connection for longer operations
   */
  private getUnpooledConnection() {
    // Use unpooled connection if available, otherwise fallback to pooled
    if (process.env.DATABASE_URL_UNPOOLED) {
      return this.createQueryExecutor(db.sql.bind(db));
    } else {
      return this.getPooledConnection();
    }
  }

  /**
   * Creates a query executor that supports both:
   * 1. Tagged template literals: conn`SELECT * FROM users`
   * 2. Query string + params: conn("SELECT * FROM users WHERE id = $1", [userId])
   */
  private createQueryExecutor(sqlExecutor: any) {
    // Return a function that preserves both tagged template and function call patterns
    const executor = function(this: any, ...args: any[]) {
      // If first argument is a string array with raw property, it's a tagged template call
      if (Array.isArray(args[0]) && Object.prototype.hasOwnProperty.call(args[0], 'raw')) {
        // Use direct function call instead of apply for tagged templates
        return sqlExecutor(...args);
      } 
      // If it's a string, treat it as a regular query with params
      else if (typeof args[0] === 'string') {
        const [query, params] = args;
        return db.query(query, params || []);
      }
      // Handle any other case - use direct function call
      return sqlExecutor(...args);
    };
    
    // Attach original tagged template handler
    executor.tagged = sqlExecutor;
    
    return executor;
  }

  /**
   * Execute a database transaction with proper error handling and retries
   */
  public async executeTransaction<T>(
    callback: (transaction: any) => Promise<T>,
    retries: number = 3
  ): Promise<T> {
    const conn = this.getWriteConnection();
    
    let attempts = 0;
    while (attempts < retries) {
      try {
        // Begin transaction
        await conn`BEGIN`;
        
        // Execute the transaction callback
        const result = await callback(conn);
        
        // Commit transaction
        await conn`COMMIT`;
        
        return result;
      } catch (error) {
        // Rollback on error
        try {
          await conn`ROLLBACK`;
        } catch (rollbackError) {
          console.error('Failed to rollback transaction:', rollbackError);
        }
        
        attempts++;
        
        // If we've used all retries, throw the error
        if (attempts >= retries) {
          throw error;
        }
        
        // Exponential backoff before retry
        const backoffMs = Math.min(100 * Math.pow(2, attempts), 3000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
    
    throw new Error('Transaction failed after maximum retries');
  }
}

// Export singleton instance
export const dbConnection = DBConnectionManager.getInstance();

// Export convenience methods
export const getReadConnection = () => dbConnection.getReadConnection();
export const getWriteConnection = () => dbConnection.getWriteConnection();
export const executeTransaction = <T>(callback: (transaction: any) => Promise<T>) => 
  dbConnection.executeTransaction(callback); 
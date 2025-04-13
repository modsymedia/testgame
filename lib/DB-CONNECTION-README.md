# Database Connection Manager

This module provides an optimized database connection management strategy for the application when using Neon Postgres with Vercel.

## Key Features

- **Optimized for Vercel Serverless**: Automatically adapts connection strategy based on environment
- **Connection Pooling**: Uses pooled connections for read operations and non-blocking queries
- **Direct Connections**: Uses unpooled connections for longer transactions when needed
- **Unified API**: Supports both tagged template literals and traditional query strings
- **Transaction Support**: Built-in transaction handling with automatic retries
- **Error Handling**: Comprehensive error handling with exponential backoff

## Usage Examples

### Basic Queries

```typescript
import { getReadConnection, getWriteConnection } from './db-connection';

// For read operations
async function getUser(userId: string) {
  const sql = getReadConnection();
  
  // Using tagged template literals
  const result = await sql`
    SELECT * FROM users WHERE id = ${userId}
  `;
  
  return result.rows[0];
}

// For write operations
async function updateUser(userId: string, data: any) {
  const sql = getWriteConnection();
  
  // Using tagged template literals
  await sql`
    UPDATE users 
    SET name = ${data.name}, email = ${data.email} 
    WHERE id = ${userId}
  `;
  
  // Or using traditional query string format
  await sql(
    "UPDATE users SET name = $1, email = $2 WHERE id = $3", 
    [data.name, data.email, userId]
  );
}
```

### Transactions

```typescript
import { executeTransaction } from './db-connection';

async function transferPoints(fromUserId: string, toUserId: string, amount: number) {
  return executeTransaction(async (sql) => {
    // Deduct points from sender
    await sql`
      UPDATE users 
      SET points = points - ${amount} 
      WHERE id = ${fromUserId} AND points >= ${amount}
    `;
    
    // Get number of affected rows to ensure sender had enough points
    const deductResult = await sql`
      SELECT COUNT(*) as affected FROM users 
      WHERE id = ${fromUserId} AND points >= 0
    `;
    
    if (deductResult.rows[0].affected === 0) {
      throw new Error('Insufficient points');
    }
    
    // Add points to receiver
    await sql`
      UPDATE users 
      SET points = points + ${amount} 
      WHERE id = ${toUserId}
    `;
    
    return true;
  });
}
```

## Best Practices

1. **Use Read Connections for Queries**: Always use `getReadConnection()` for SELECT queries
2. **Use Write Connections for Mutations**: Use `getWriteConnection()` for INSERT/UPDATE/DELETE
3. **Use Transactions for Multi-Statement Operations**: When multiple operations need to succeed or fail together
4. **Handle Connection Errors**: Always handle database errors appropriately
5. **Close Long-Running Connections**: For operations outside of API routes, explicitly close connections

## Implementation Details

The connection manager automatically detects whether it's running in a serverless environment (Vercel) and adjusts its strategy:

- In serverless environments, read operations use connection pooling for efficiency
- Write operations use direct connections to prevent timeouts during longer operations
- In non-serverless environments, pooled connections are used for everything

The module also handles proper resource cleanup to prevent connection leaks. 
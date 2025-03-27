# Using Neon Postgres with This Application

This application uses [Neon Serverless Postgres](https://neon.tech) for database storage, which offers several advantages over SQLite:

- Serverless architecture optimized for edge and serverless environments
- HTTP-based database access (no TCP connections required)
- Automatic scaling and high availability
- No file permission issues on deployment platforms

## Connection Details

We use the `@neondatabase/serverless` package to connect to Neon Postgres. This package allows database access over HTTP instead of TCP, making it ideal for serverless environments like Vercel.

## Environment Variables

The following environment variables should be set in your `.env.local` file:

```
DATABASE_URL=postgres://username:password@hostname/database?sslmode=require
```

For local development, you can use the Neon web console to create a connection string.

## Database Schema

The application uses two main tables:

1. **users** - Stores basic user information and points
   ```sql
   CREATE TABLE IF NOT EXISTS users (
     wallet_address TEXT PRIMARY KEY,
     username TEXT,
     points INTEGER DEFAULT 0,
     score INTEGER DEFAULT 0,
     multiplier REAL DEFAULT 1.0,
     last_points_update TIMESTAMP,
     last_played TIMESTAMP,
     created_at TIMESTAMP
   )
   ```

2. **pet_states** - Stores pet statistics and states
   ```sql
   CREATE TABLE IF NOT EXISTS pet_states (
     wallet_address TEXT PRIMARY KEY,
     health INTEGER DEFAULT 30,
     happiness INTEGER DEFAULT 40,
     hunger INTEGER DEFAULT 50,
     cleanliness INTEGER DEFAULT 40,
     energy INTEGER DEFAULT 30,
     quality_score INTEGER DEFAULT 0,
     last_state_update TIMESTAMP,
     FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
   )
   ```

## Initialization

The database tables are automatically created when the application starts using the code in `lib/neon-init.ts`.

## API Routes

The application includes the following API routes that interact with the database:

- `/api/wallet` - Handles user wallet data and pet state
- `/api/leaderboard` - Manages the game leaderboard

## Fallback Mechanism

In case of database connection issues, the application includes an in-memory fallback storage mechanism to prevent data loss during temporary outages.

## Best Practices

1. **Query Optimization**:
   - Keep queries simple and focused
   - Use parameterized queries to prevent SQL injection

2. **Connection Management**:
   - The Neon serverless driver maintains connections efficiently
   - No need to manually open/close connections as with traditional Postgres

3. **Error Handling**:
   - All database operations include proper error handling
   - Failed operations fall back to in-memory storage when appropriate

## Debugging

If you encounter database issues:

1. Check the Neon console dashboard for database status
2. Review application logs for specific error messages
3. Verify that environment variables are correctly set
4. Ensure your IP address is allowed in Neon's access controls

## Local Development

For local development:

1. Create a free Neon database at [neon.tech](https://neon.tech)
2. Copy your connection string to `.env.local`
3. Run the application with `npm run dev`

## Additional Resources

- [Neon Serverless Driver Documentation](https://neon.tech/docs/serverless/serverless-driver)
- [Neon SQL Editor](https://neon.tech/docs/get-started-with-neon/query-with-neon-sql-editor)
- [Neon Dashboard](https://console.neon.tech) 
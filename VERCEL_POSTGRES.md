# Vercel Postgres Integration

This project has been updated to use Vercel Postgres for data storage instead of SQLite. This change
provides several benefits:

1. **Persistent Storage**: Data is stored in a managed Postgres database, ensuring it persists across deployments and server restarts
2. **Scalability**: Vercel Postgres scales automatically with your application
3. **Reliability**: No more read-only filesystem errors on the server
4. **Performance**: Optimized for Vercel's hosting environment

## Setup Instructions

### 1. Create a Postgres Database in Vercel

1. In your Vercel dashboard, select your project
2. Go to the Storage tab and click "Connect Store"
3. Select Postgres
4. Enter a database name (e.g., `pets_postgres_db`)
5. Select a region close to your deployment
6. Click "Create and Continue"
7. In the next view, click "Connect"

### 2. Set Up Environment Variables

Vercel will automatically add the database credentials to your project as environment variables:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

For local development, you need to pull these variables:

```bash
vercel env pull .env.local
```

### 3. Database Schema

The database schema will be automatically created when the application starts. The following tables are created:

- `users`: Stores user data including wallet address, points, and multiplier
- `pet_states`: Stores pet state data like health, happiness, hunger, etc.

## Implementation Details

### Database Client

The database client is implemented in `lib/postgres.ts`. It provides:

- Table initialization
- CRUD operations for users and pet states
- Conversion between database snake_case and JavaScript camelCase

### API Routes

The following API routes have been updated to use Vercel Postgres:

- `/api/wallet`: Handles wallet data operations (POST/GET/PUT)
- `/api/leaderboard`: Manages leaderboard data (GET/POST)

### Client-Side Integration

The client-side utilities in `utils/wallet.ts` have been updated to work with the Postgres backend, including:

- Saving wallet data
- Loading wallet data
- Burning points
- Updating points

## Fallback Mechanism

For robustness, the application includes in-memory fallback storage in case database operations fail:

- If a database write fails, data is stored in memory
- Subsequent reads check memory first before hitting the database
- Cache invalidation is handled automatically

## Dashboard Access

To view and manage your Vercel Postgres database:

1. Go to your Vercel dashboard
2. Select your project
3. Go to the Storage tab
4. Select your Postgres database
5. Use the Query, Browse, and Metrics tabs to interact with your database 
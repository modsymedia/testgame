# Leaderboard Feature Documentation

This document explains how to set up and use the leaderboard feature in the Gochi virtual pet game.

## Overview

The leaderboard displays top players ranked by their scores. It includes:

- Player ranking (1st, 2nd, 3rd, etc.)
- Username (or truncated wallet address)
- Score

## Setup Options

You can use the leaderboard in two modes:

### 1. Development Mode (No Database)

In development mode, the leaderboard uses mock data stored in memory:

- No MongoDB configuration required
- Pre-populated with realistic sample data
- Changes to scores are stored in-memory until server restart

### 2. Production Mode (MongoDB)

For persistent storage, configure a MongoDB database:

1. Create a MongoDB Atlas account (free tier works fine)
2. Create a cluster and database
3. Update `.env.local` with your MongoDB connection string
4. Run the seed script to populate initial data (optional)

## Configuration

### Setting Up MongoDB

1. Create a `.env.local` file in the project root with:

```
NEXT_PUBLIC_MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
NEXT_PUBLIC_MONGODB_DB=gochi-game
```

Replace `<username>`, `<password>`, `<cluster>`, and `<database>` with your MongoDB credentials.

### Seeding Sample Data

To populate the database with sample data:

```bash
node scripts/seed-database.js
```

## API Endpoints

### GET /api/leaderboard

Retrieves the current leaderboard.

Query parameters:
- `limit`: Number of entries to return (default: 10)

Example response:
```json
{
  "leaderboard": [
    {
      "walletAddress": "8zJ91ufGPmxrJvVyPEW4CNQciLkzCVPVEZX9LovT9i6S",
      "username": "CryptoWhale",
      "score": 9850,
      "rank": 1
    },
    ...
  ],
  "source": "mongodb" | "mock" | "memory"
}
```

### POST /api/leaderboard

Update a user's score.

Request body:
```json
{
  "walletAddress": "user-wallet-address",
  "score": 1000
}
```

Example response:
```json
{
  "success": true,
  "updated": true,
  "source": "mongodb" | "mock" | "memory"
}
```

## Client-Side Usage

### Display Leaderboard

Use the `LeaderboardDisplay` component:

```jsx
import LeaderboardDisplay from '@/components/landing/LeaderboardDisplay';

export default function Home() {
  return (
    <div>
      <h1>Welcome to Gochi Game</h1>
      <LeaderboardDisplay />
    </div>
  );
}
```

### Update User Score

Use the `updateUserScore` function:

```jsx
import { updateUserScore } from '@/utils/leaderboard';

// When a user completes a game
const handleGameComplete = async (score) => {
  const walletAddress = user.walletAddress;
  await updateUserScore(walletAddress, score);
  
  // Optionally refresh leaderboard
  // ...
};
```

## Testing

### Running Tests

To test the leaderboard functionality:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. In another terminal, run the test script:
   ```bash
   node scripts/test-leaderboard.js
   ```

This will test:
- Test endpoint functionality
- Main leaderboard API
- Score update functionality 
- MongoDB connection (if configured)

### Purging Data

To clear all leaderboard data (useful for testing):

```bash
node scripts/purge-leaderboard.js
```

## Troubleshooting

### Missing Data

If the leaderboard is empty:
- Check that your MongoDB connection string is valid
- Run the seed script to populate data
- Verify the database and collection exist

### API Errors

If you encounter API errors:
- Check server logs for detailed error messages
- Verify MongoDB connection string
- Ensure the server has network access to your MongoDB instance

### Type Errors

If you encounter TypeScript errors:
- Make sure `LeaderboardEntry` and `User` types are properly defined in `lib/models.ts`
- Verify that API responses match expected types 
# Neon Database Integration

This project uses [Neon Database](https://neon.tech), a serverless Postgres service, for data storage.

## About Neon Database

Neon separates storage and compute to offer:
- Serverless: Auto-scaling to zero when not in use
- Branching: Create development environments instantly
- SQL: Full Postgres compatibility
- Edge-ready: Low-latency global data access

## Implementation

The project implements Neon Database in the following ways:

1. **Database Client**
   - Using `@neondatabase/serverless` for serverless-friendly Postgres access
   - Connection is managed in `lib/neon.ts`
   - Tables are created automatically if they don't exist

2. **Database Schema**
   - `users` table: Stores wallet addresses, points, and names
   - `pet_states` table: Stores pet statistics including hunger, happiness, energy levels

3. **API Routes**
   - `/api/wallet.ts` for managing user and pet data
   - `/api/leaderboard.ts` for handling game scores

4. **Environment Variables**
   - The application requires a `DATABASE_URL` environment variable
   - This should be a full Postgres connection string to your Neon database

## Setup

1. **Create a Neon Account**
   - Sign up at [https://neon.tech](https://neon.tech)
   - Create a new project
   - Create a database within your project

2. **Get Your Connection String**
   - Find your connection string in the Neon dashboard
   - It should look like: `postgres://user:password@hostname/database`

3. **Set Environment Variables**
   - Copy `.env.local.example` to `.env.local`
   - Add your Neon connection string as `DATABASE_URL`

4. **Development Mode**
   - Run `npm run dev` to start the development server
   - The app will connect to your Neon database

## Fallback Mechanism

For improved reliability, the application includes a fallback storage mechanism that temporarily stores data in memory if the database connection fails. This ensures users can continue using the application even during database outages.

## Production Deployment

When deploying to production:

1. Add your Neon connection string as a `DATABASE_URL` environment variable in your hosting platform
2. Ensure your production environment has access to Neon (check firewall settings)
3. Consider setting up a connection pool for high-traffic applications

## Troubleshooting

- **Connection Errors**: Make sure your connection string is correct and your IP is not blocked by Neon
- **Missing Tables**: Tables are created automatically on first use, but verify if schema creation failed
- **Performance Issues**: Neon has automatic branching capability for development environments 
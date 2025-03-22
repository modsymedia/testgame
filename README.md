# Crypto Pet Game

A virtual pet game with Phantom wallet integration for Solana blockchain.

## Features

- Connect your Phantom wallet to start your pet journey
- Unique pet identity connected to your wallet
- Points system with multiplier based on wallet holdings
- Pet care simulation game with multiple stats (health, food, mood, etc.)
- Leaderboard to compete with other players

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- Phantom wallet browser extension
- MongoDB database (for leaderboard functionality)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crypto-pet-game
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Edit `.env.local` to add your MongoDB connection string

```bash
cp .env.local.example .env.local
# Edit .env.local with your database credentials
```

4. Start the development server:
```bash
npm run dev
```

Alternatively, you can use the launcher script:
```bash
chmod +x launch.sh
./launch.sh
```

## Database Setup

The application uses MongoDB for storing leaderboard data. To set up your database:

1. Create a MongoDB database (you can use MongoDB Atlas for a free cloud database)
2. Get your connection string from MongoDB
3. Add the connection string to your `.env.local` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@clustername.mongodb.net/gochi-game?retryWrites=true&w=majority
   MONGODB_DB=gochi-game
   ```

## Usage

1. Visit the application in your browser (default: http://localhost:3000)
2. Connect your Phantom wallet
3. Name your pet
4. Start playing and earning points
5. Check the leaderboard to see how you rank against other players

## Note

This application requires the Phantom wallet browser extension to work properly. If you don't have it installed, you'll be prompted to install it when you try to connect.

## License

[MIT](LICENSE)

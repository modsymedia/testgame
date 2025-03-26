# Crypto Pet Game

A virtual pet game with Phantom wallet integration for Solana blockchain.

## Features

- Connect your Phantom wallet to start your pet journey
- Unique pet identity connected to your wallet
- Points system with multiplier based on wallet holdings
- Pet care simulation game with multiple stats (health, food, mood, etc.)
- Leaderboard to compete with other players
- Local SQLite database storage (no MongoDB required)

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- Phantom wallet browser extension

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

3. Start the development server:
```bash
npm run dev
```

Alternatively, you can use the launcher script:
```bash
chmod +x launch.sh
./launch.sh
```

## Database Setup

The application uses SQLite for local data storage. No external database is required.

The SQLite database file will be automatically created in the `data` directory when the application starts.

## API Endpoints

The application provides Next.js API routes for interacting with the database:

- `GET /api/points?walletAddress={address}` - Get points for a wallet
- `POST /api/points` - Update points based on pet state
- `GET /api/points-leaderboard` - Get leaderboard data
- `POST /api/referral` - Process referral

## Usage

1. Visit the application in your browser (default: http://localhost:3001)
2. Connect your Phantom wallet
3. Name your pet
4. Start playing and earning points
5. Check the leaderboard to see how you rank against other players

## Note

This application requires the Phantom wallet browser extension to work properly. If you don't have it installed, you'll be prompted to install it when you try to connect.

## License

[MIT](LICENSE)

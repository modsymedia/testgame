export interface Interaction {
  id: string;
  timestamp: Date | number;  // Allow both Date and number for timestamp
  type: string;  // Make type more flexible to allow lowercase types
  stats?: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  };
  emotion?: string;
  blockchainStats?: Record<string, any>;
  tweet?: string;
  blockNumber?: string;
  transactionUrl?: string;
} 
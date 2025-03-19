export interface Interaction {
  id: string;
  timestamp: Date;
  type: "Feed" | "Play" | "Clean" | "Doctor";
  stats: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  };
  emotion: "happy" | "sad" | "tired" | "hungry" | "curious" | "dead";
  blockchainStats: any;
  tweet: string;
  blockNumber: string;
  transactionUrl: string;
} 
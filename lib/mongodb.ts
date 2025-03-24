import { MongoClient } from 'mongodb';

// Check if the MongoDB URI is properly defined
const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient>;

// If MongoDB URI is not configured or is using the placeholder
if (!uri || uri.includes('username:password')) {
  console.warn('MongoDB not properly configured');
  
  // Simple mock client that returns empty data
  const mockClient = {
    db: () => ({
      collection: () => ({
        find: () => ({
          sort: () => ({
            limit: () => ({
              toArray: async () => [],
            }),
            toArray: async () => [],
          }),
          toArray: async () => [],
          limit: () => ({
            toArray: async () => [],
          }),
        }),
        findOne: async () => null,
        insertOne: async () => ({ insertedId: 'mock-id' }),
        insertMany: async () => ({ insertedCount: 0, insertedIds: [] }),
        updateOne: async () => ({ modifiedCount: 0, upsertedCount: 0 }),
        deleteOne: async () => ({ deletedCount: 0 }),
        deleteMany: async () => ({ deletedCount: 0 }),
        countDocuments: async () => 0,
        listCollections: () => ({
          toArray: async () => [],
        }),
      }),
    }),
    connect: async () => mockClient,
    close: async () => {},
  } as unknown as MongoClient;

  // Use a resolved promise to match the real implementation
  clientPromise = Promise.resolve(mockClient);
} else {
  // Regular MongoDB setup
  let client: MongoClient;
  
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

// Export the MongoDB client promise
export default clientPromise; 
#!/bin/bash

# Install Solana web3.js
echo "Installing Solana dependencies..."
npm install @solana/web3.js

# Create images directory if it doesn't exist
echo "Setting up project directories..."
mkdir -p public/images

echo "Setup complete. You can now run the application with 'npm run dev'" 
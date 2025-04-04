# User Data Management

This document explains the user data management system implemented in the Gochi Game.

## Architecture Overview

The user data management system is designed to:

1. Provide a single source of truth for user data
2. Ensure consistent data across all components
3. Properly sync data with the server
4. Provide real-time updates to all components

## Components

### UserDataContext

The `UserDataContext` is the central data store for all user-related information:

- Points
- Claimed points
- Pet name
- Multiplier
- Rank
- Referral information
- Last login/sync timestamps

The context provides the following methods:

- `updatePoints(newPoints)`: Update user points
- `syncWithServer()`: Force a sync with the server
- `claimPoints(amount)`: Claim points for rewards
- `updatePetName(name)`: Update pet name
- `resetUserData()`: Reset user data (for logout)

### Usage in Components

Components can access user data in two ways:

1. **Direct Context Usage**:
   ```tsx
   import { useUserData } from '@/context/UserDataContext';
   
   function MyComponent() {
     const { userData, updatePoints } = useUserData();
     
     return <div>Points: {userData.points}</div>;
   }
   ```

2. **Props from Parent**:
   ```tsx
   interface PointsDisplayProps {
     points?: number;
     multiplier?: number;
   }
   
   function PointsDisplay({ points, multiplier }: PointsDisplayProps) {
     // Component can use either props or context values
     const { userData } = useUserData();
     const pointsToShow = points ?? userData.points;
     
     return <div>Points: {pointsToShow}</div>;
   }
   ```

## Data Synchronization

1. **Automatic Sync**:
   - Every 30 seconds with server
   - On page navigation/tab visibility change
   - Before page unload (if changes pending)

2. **Manual Sync**:
   - When user triggers a refresh
   - After significant actions (e.g., claiming rewards)

## Using with Wallet Connection

The UserDataContext depends on the WalletContext for authentication:

```tsx
// Example App structure
<WalletProvider>
  <UserDataProvider>
    <YourApp />
  </UserDataProvider>
</WalletProvider>
```

## Component Guidelines

1. **Always use useUserData() for user data**
2. **Avoid local state for user data**
3. **Use data from props when specific data is passed**
4. **Call syncWithServer() after important actions**

## Debugging

When debugging data synchronization issues:

1. Check the last sync timestamp: `userData.lastSync`
2. Verify context is properly initialized
3. Check console for sync error messages

## Example: Updating Points

```tsx
function GameAction() {
  const { userData, updatePoints } = useUserData();
  
  const handleAction = async () => {
    // Perform game action
    const earnedPoints = 100;
    const newTotal = userData.points + earnedPoints;
    
    // Update points (updates UI immediately and syncs with server)
    await updatePoints(newTotal);
  };
  
  return <button onClick={handleAction}>Earn Points</button>;
}
``` 
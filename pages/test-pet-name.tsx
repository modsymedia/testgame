import { useEffect, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/forms/button';
import { UsernameModal } from '@/components/game/PetNameModal';

export default function TestPetName() {
  const { showPetNamePrompt, isConnected, walletData, connect } = useWallet();
  const [buttonClicked, setButtonClicked] = useState(false);

  // Direct access to WalletContext to set pet name prompt
  const forceShowPetNamePrompt = () => {
    setButtonClicked(true);
    // Set the global trigger
    // @ts-ignore - accessing custom global property
    window.__forceShowPetNamePrompt = true;
    
    // Also try to run connect to trigger it through the normal path
    if (isConnected) {
      console.log("Already connected, trying to re-trigger pet name prompt");
    } else {
      console.log("Not connected, trying to connect to trigger pet name prompt");
      connect();
    }
  };

  useEffect(() => {
    // Register a window function that component can call
    // @ts-ignore - adding custom function to window
    window.__forceShowPetNamePrompt = true;
    
    return () => {
      // Clean up
      // @ts-ignore - removing custom function
      delete window.__forceShowPetNamePrompt;
    };
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Test Pet Name Dialog</h1>
      
      <div className="space-y-4 mb-8">
        <div className="p-4 bg-gray-100 rounded">
          <h2 className="font-bold">Current State:</h2>
          <ul className="list-disc pl-6 mt-2">
            <li>Connected: {isConnected ? 'Yes' : 'No'}</li>
            <li>Has Wallet Data: {walletData ? 'Yes' : 'No'}</li>
            <li>Username: {walletData?.username || 'None'}</li>
            <li>Show Pet Name Prompt: {showPetNamePrompt ? 'Yes' : 'No'}</li>
            <li>Button Clicked: {buttonClicked ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>
      
      <div className="flex flex-col space-y-4">
        <Button 
          onClick={forceShowPetNamePrompt}
          className="max-w-xs"
        >
          Force Show Pet Name Dialog
        </Button>
        
        <Button 
          onClick={() => connect()}
          className="max-w-xs bg-blue-600"
          disabled={isConnected}
        >
          Connect Wallet
        </Button>
      </div>
      
      <div className="mt-8">
        <p className="text-sm text-gray-500">
          Note: Force Pet Name Dialog button uses a workaround to trigger the dialog.
          Check console logs for more information.
        </p>
      </div>
      
      {/* Include UsernameModal directly here as well */}
      <UsernameModal />
    </div>
  );
} 
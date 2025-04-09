import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/feedback/dialog';
import { Button } from '@/components/ui/forms/button';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import Image from 'next/image'; // Importing Image from next/image

export function WalletSelectModal() {
  const { connect, error, availableWallets } = useWallet();
  const [open, setOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (walletName: string) => {
    setIsConnecting(true);
    try {
      const connected = await connect(walletName);
      if (connected) {
        setOpen(false);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="py-6 px-12 text-xl bg-white text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-1">
        Connect Wallet
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
            <DialogDescription>
              Choose a wallet to connect to this app
            </DialogDescription>
          </DialogHeader>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 py-4">
            {availableWallets.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-sm text-gray-500 mb-4">
                  No Solana wallets found. Please install one of the wallets below:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                      <Image src="https://www.phantom.app/img/logo.png" alt="Phantom" width={24} height={24} /> {/* Using Image component */}
                      <span>Phantom</span>
                    </Button>
                  </a>
                  <a href="https://solflare.com/" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                      <Image src="https://solflare.com/assets/logo.svg" alt="Solflare" width={24} height={24} /> {/* Using Image component */}
                      <span>Solflare</span>
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              availableWallets.map(wallet => (
                <Button
                  key={wallet.name}
                  onClick={() => handleConnect(wallet.name)}
                  disabled={isConnecting}
                  variant="outline"
                  className="flex items-center justify-between py-6"
                >
                  <div className="flex items-center">
                    <Image 
                      src={wallet.icon} 
                      alt={wallet.label} 
                      width={32} 
                      height={32} 
                      className="mr-4" // Using Image component
                    />
                    <span>{wallet.label}</span>
                  </div>
                  {isConnecting && <span className="animate-spin">⌛</span>}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 

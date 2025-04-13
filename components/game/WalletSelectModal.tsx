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

// Define static wallet info outside the component
const walletsToShow = [
  {
    name: 'phantom',
    label: 'Phantom',
    icon: 'https://187760183-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MVOiF6Zqit57q_hxJYp%2Fuploads%2FHEjleywo9QOnfYebBPCZ%2FPhantom_SVG_Icon.svg?alt=media&token=71b80a0a-def7-4f98-ae70-5e0843fdaaec',
    installUrl: 'https://phantom.app/'
  },
  {
    name: 'solflare',
    label: 'Solflare',
    icon: 'https://www.solflare.com/wp-content/uploads/2024/11/App-Icon.svg',
    installUrl: 'https://solflare.com/'
  }
];

export function WalletSelectModal() {
  const { connect, error } = useWallet();
  const [open, setOpen] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);

  const handleConnect = async (walletName: string) => {
    setConnectingWallet(walletName);
    try {
      const connected = await connect(walletName);
      if (connected) {
        setOpen(false);
      }
    } finally {
      setConnectingWallet(null);
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
            {walletsToShow.map(wallet => (
              <Button
                key={wallet.name}
                onClick={() => handleConnect(wallet.name)}
                disabled={connectingWallet === wallet.name}
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
                {connectingWallet === wallet.name && <span className="animate-spin">⌛</span>}
              </Button>
            ))}
          </div>

          {/* Optional: Add a section to suggest installation if needed, separate from connection logic */}
          <div className="text-center p-4 border-t mt-4">
             <p className="text-sm text-gray-500 mb-2">
               Don&apos;t have a wallet? Install one:
             </p>
             <div className="grid grid-cols-2 gap-4">
               {walletsToShow.map(wallet => (
                 <a key={wallet.name + '-install'} href={wallet.installUrl} target="_blank" rel="noopener noreferrer">
                   <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                     <Image src={wallet.icon} alt={wallet.label} width={24} height={24} />
                     <span>{wallet.label}</span>
                   </Button>
                 </a>
               ))}
             </div>
           </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 

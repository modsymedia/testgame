import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/feedback/dialog";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import Image from "next/image"; // Importing Image from next/image
import { Button } from "@/components/ui/forms/button"; // Keep for internal buttons

// Define static wallet info outside the component
const walletsToShow = [
  {
    name: "phantom",
    label: "Phantom",
    icon: "https://187760183-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MVOiF6Zqit57q_hxJYp%2Fuploads%2FHEjleywo9QOnfYebBPCZ%2FPhantom_SVG_Icon.svg?alt=media&token=71b80a0a-def7-4f98-ae70-5e0843fdaaec",
    installUrl: "https://phantom.app/",
  },
  {
    name: "solflare",
    label: "Solflare",
    icon: "https://www.solflare.com/wp-content/uploads/2024/11/App-Icon.svg",
    installUrl: "https://solflare.com/",
  },
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
        // Add a small delay for Solflare to ensure connection stabilizes
        if (walletName === "solflare") {
          // Give a bit more time for Solflare to initialize
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setOpen(false);
      }
    } finally {
      setConnectingWallet(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative focus:outline-none w-[190px] h-[52px] group transition-all duration-200 active:translate-y-[2px] hover:animate-button-pulse"
        style={{
          filter: "drop-shadow(0px 3.35465px 0.670931px rgba(0, 0, 0, 0.45))",
        }}
      >
        {/* Main outer button - dark border with lime background */}
        <div className="flex-col flex items-center justify-center relative top-[2.44px] w-[calc(100%-7.24px)] h-[38px] bg-[#C9EE6A] border-4 border-[#304700] group-hover:bg-[#d5fa76] group-active:bg-[#b9de5a] transition-colors">
        <span
            className="text-[#304700] font-bold tracking-wider font-pixelify text-[12px] sm:text-[14px] group-hover:text-[#1f2e00] transition-colors group-active:translate-y-[1px]"
            style={{
              textTransform: "uppercase",
            }}
          >
            GET STARTED
          </span>
          
          
          <div className="absolute top-0 left-0 w-[36.8%] h-[4px] bg-[#E8FCB4] group-hover:bg-[#f5ffd0] transition-colors"></div>
          {/* <div className="absolute top-[-4px] left-[-4px]  w-[4px] h-[4px] bg-[#d6e0a4] z-[5]"></div> */}
          {/* <div className="absolute top-[-4px] left-[-4px]  w-[8px] h-[8px] bg-[#304700]"></div> */}
        </div>

        {/* Inner lighter colored area */}
        <div className="absolute top-[22px] w-[calc(100%-11.63px)] h-[29px] bg-[#E8FCB4] border-2 border-[#304700] z-[-1] group-hover:bg-[#f5ffd0] group-active:top-[23px] transition-all"></div>

      </button>

      <style jsx global>{`
        @keyframes buttonPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          60% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        .animate-button-pulse {
          animation: buttonPulse 1.2s infinite;
        }
      `}</style>

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
            {walletsToShow.map((wallet) => (
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
                {connectingWallet === wallet.name && (
                  <span className="animate-spin">⌛</span>
                )}
              </Button>
            ))}
          </div>

          {/* Optional: Add a section to suggest installation if needed, separate from connection logic */}
          <div className="text-center p-4 border-t mt-4">
            <p className="text-sm text-gray-500 mb-2">
              Don&apos;t have a wallet? Install one:
            </p>
            <div className="grid grid-cols-2 gap-4">
              {walletsToShow.map((wallet) => (
                <a
                  key={wallet.name + "-install"}
                  href={wallet.installUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Image
                      src={wallet.icon}
                      alt={wallet.label}
                      width={24}
                      height={24}
                    />
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

import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { signIn } from "next-auth/react"; // Added for Twitter sign-in
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/feedback/dialog";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import Image from "next/image";
// Button import removed as it's unused
import PixelatedContainer from "@/components/game/PixelatedContainerBig"; // Import PixelatedContainerBig

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

// Renamed component
export function SignInModal() {
  const { connect, error } = useWallet();
  const [open, setOpen] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [connectingTwitter, setConnectingTwitter] = useState(false); // State for Twitter button

  const handleConnect = async (walletName: string) => {
    setConnectingWallet(walletName);
    try {
      const connected = await connect(walletName);
      if (connected) {
        if (walletName === "solflare") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        setOpen(false); // Close modal on success
      }
    } finally {
      setConnectingWallet(null);
    }
  };

  // Twitter Sign-In Handler
  const handleTwitterSignIn = async () => {
    setConnectingTwitter(true);
    try {
      // Redirects the user to Twitter for authentication
      await signIn("twitter", { callbackUrl: "/console/gotchi" });
      // If signIn is successful, the page will redirect,
      // so closing the modal here might not be necessary unless there's an error immediate error.
      // setOpen(false); // Close modal after initiating sign-in
    } catch (err) {
      console.error("Twitter Sign-In failed:", err);
      // Handle error appropriately, maybe show an alert
    } finally {
      setConnectingTwitter(false);
    }
  };

  return (
    <>
      {/* Keep the original trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="relative focus:outline-none w-[190px] h-[52px] group transition-all duration-200 active:translate-y-[2px] hover:animate-button-pulse"
        style={{
          filter: "drop-shadow(0px 3.35465px 0.670931px rgba(0, 0, 0, 0.45))",
        }}
      >
        <div className="flex-col flex items-center justify-center relative top-[2.44px] w-[calc(100%-7.24px)] h-[38px] bg-[#C9EE6A] border-4 border-[#304700] group-hover:bg-[#d5fa76] group-active:bg-[#b9de5a] transition-colors">
          <span
            className="text-[#304700] font-bold tracking-wider font-pixelify text-[12px] sm:text-[14px] group-hover:text-[#1f2e00] transition-colors group-active:translate-y-[1px]"
            style={{ textTransform: "uppercase" }}
          >
            GET STARTED
          </span>
          <div className="absolute top-0 left-0 w-[36.8%] h-[4px] bg-[#E8FCB4] group-hover:bg-[#f5ffd0] transition-colors"></div>
        </div>
        <div className="absolute top-[22px] w-[calc(100%-11.63px)] h-[29px] bg-[#E8FCB4] border-2 border-[#304700] z-[-1] group-hover:bg-[#f5ffd0] group-active:top-[23px] transition-all"></div>
      </button>

      {/* Global styles remain the same */}
      <style jsx global>{`
        @keyframes buttonPulse { 0% { transform: scale(1); } 50% { transform: scale(1.03); } 60% { transform: scale(1.02); } 100% { transform: scale(1); } }
        .animate-button-pulse { animation: buttonPulse 1.2s infinite; }
      `}</style>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Use DialogContent without default styling, apply custom classes */}
        <DialogContent className="sm:max-w-lg p-0 border-none bg-transparent shadow-none">
          {/* Apply PixelatedContainerBig */}
          <PixelatedContainer bgcolor="#C9EE6A" className="p-6 sm:p-8">
            {/* Custom Header */}
            <div className="mb-6 text-center">
              <DialogTitle asChild> 
                <h2 className="font-pixelify text-2xl sm:text-3xl font-bold text-[#304700] mb-2 uppercase tracking-wider">
                  Sign In / Connect
                </h2>
              </DialogTitle>
              <DialogDescription asChild> 
                <p className="font-vcr text-sm sm:text-base text-[#4D7700]">
                  Choose your preferred method to join the fun!
                </p>
              </DialogDescription>
            </div>

            {/* Error Alert - styled to fit */}
            {error && (
              <Alert variant="destructive" className="mb-4 bg-red-100 border-red-400 text-red-700 font-vcr">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Grid for Sign-In Options */}
            <div className="grid grid-cols-1 gap-4">
              {/* Twitter Button */}
              <button
                onClick={handleTwitterSignIn}
                disabled={connectingTwitter}
                className="w-full relative group focus:outline-none h-[50px] transition-all duration-200 active:translate-y-[1px]"
                style={{ filter: "drop-shadow(0px 2px 0.5px rgba(0, 0, 0, 0.3))" }}
              >
                <div className="flex items-center justify-center w-full h-full bg-[#6ab4ee] border-2 border-[#005b99] group-hover:bg-[#7acaff] group-active:bg-[#5a9ed0] transition-colors">
                  <Image src="/assets/icons/social/x.png" alt="Twitter" width={24} height={24} className="mr-3"/>
                   <span className="text-white font-bold font-pixelify tracking-wide text-sm sm:text-base">
                     {connectingTwitter ? "Connecting..." : "Sign in with Twitter"}
                   </span>
                </div>
                {/* Subtle highlight effect */}
                <div className="absolute top-0 left-0 w-[30%] h-[3px] bg-[#a3d7ff] group-hover:bg-[#c0e5ff] transition-colors"></div>
              </button>

               {/* Divider */}
               <div className="flex items-center my-2">
                 <div className="flex-grow border-t border-[#88ab43]"></div>
                 <span className="flex-shrink mx-4 text-[#4D7700] font-vcr text-xs">OR</span>
                 <div className="flex-grow border-t border-[#88ab43]"></div>
               </div>

              {/* Wallet Buttons */}
              {walletsToShow.map((wallet) => (
                 <button
                   key={wallet.name}
                   onClick={() => handleConnect(wallet.name)}
                   disabled={connectingWallet === wallet.name}
                   className="w-full relative group focus:outline-none h-[50px] transition-all duration-200 active:translate-y-[1px]"
                   style={{ filter: "drop-shadow(0px 2px 0.5px rgba(0, 0, 0, 0.3))" }}
                 >
                  <div className="flex items-center justify-center w-full h-full bg-[#E8FCB4] border-2 border-[#304700] group-hover:bg-[#f5ffd0] group-active:bg-[#d6e0a4] transition-colors">
                     <Image
                       src={wallet.icon}
                       alt={wallet.label}
                       width={24}
                       height={24}
                       className="mr-3"
                     />
                     <span className="text-[#304700] font-bold font-pixelify tracking-wide text-sm sm:text-base">
                       {connectingWallet === wallet.name ? "Connecting..." : `Connect ${wallet.label}`}
                     </span>
                   </div>
                   {/* Subtle highlight effect */}
                   <div className="absolute top-0 left-0 w-[30%] h-[3px] bg-white group-hover:bg-[#f5ffd0] transition-colors"></div>
                 </button>
              ))}
            </div>

            {/* Optional: Install links - Keep simple */}
            <div className="text-center mt-6 pt-4 border-t border-[#88ab43]">
              <p className="text-xs sm:text-sm text-[#4D7700] font-vcr mb-2">
                Don&apos;t have a Solana wallet?
              </p>
              <div className="flex justify-center gap-4">
                {walletsToShow.map((wallet) => (
                  <a
                    key={wallet.name + "-install"}
                    href={wallet.installUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#304700] hover:text-[#C9EE6A] hover:underline font-vcr flex items-center gap-1"
                  >
                    <Image src={wallet.icon} alt={wallet.label} width={16} height={16} />
                    Install {wallet.label}
                  </a>
                ))}
              </div>
            </div>
          </PixelatedContainer>
        </DialogContent>
      </Dialog>
    </>
  );
}

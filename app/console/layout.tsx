import { Header } from '@/components/ui/navigation/Header';
import Image from 'next/image';
import WelcomeOverlay from '@/components/ui/welcome-overlay';
import BottomNavigation from '@/components/ui/navigation/BottomNavigation';

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <picture className="fixed w-[100vw] h-[100vh]" >
          <source media="(max-width: 768px)" srcSet="/assets/mobilebg.png" />
          <Image
            src="/assets/bg.png"
            alt="Background"
            layout="fill"
            priority
            className="object-cover pixelated "
            style={{ imageRendering: "pixelated",  }}
          />
        </picture>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen justify-center">
        <Header />
        <div className="pb-24">
          {children}
        </div>
      </div>
      
      {/* Welcome Overlay */}
      <WelcomeOverlay />
      
      {/* Bottom Mobile Navigation */}
      <BottomNavigation />
    </div>
  );
} 

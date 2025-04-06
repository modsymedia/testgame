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
        <Image
          src="/assets/leaderboard-bg.png"
          alt="Leaderboard Background"
          fill
          priority
          style={{ objectFit: "cover", imageRendering: "pixelated" }}
        />
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

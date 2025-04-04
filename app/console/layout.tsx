import { Header } from '@/components/ui/navigation/Header';
import Image from 'next/image';

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
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        {children}
      </div>
    </div>
  );
} 

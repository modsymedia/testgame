"use client"

import Image from "next/image"

interface PixelIconProps {
  icon: "food" | "clean" | "doctor" | "play" | "fish" | "cookie" | "catFood" | "kibble" | 
        "laser" | "feather" | "ball" | "puzzle" | "brush" | "bath" | "nails" | "dental" |
        "checkup" | "vitamins" | "vaccine" | "surgery"
  label?: string
  isHighlighted: boolean
}

export function PixelIcon({ icon, isHighlighted }: PixelIconProps) {
  const getIcon = () => {
    switch (icon) {
      case "food":
        return <Image src="/assets/icons/foods/foods.png" alt="Food" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "clean":
        return <Image src="/assets/icons/hygiene/hygienes.png" alt="Clean" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "doctor":
        return <Image src="/assets/icons/healings/healing.png" alt="Doctor" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "play":
        return <Image src="/assets/icons/games/games.png" alt="Play" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "fish":
        return <Image src="/assets/icons/foods/food-fish.png" alt="Fish" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "cookie":
        return <Image src="/assets/icons/foods/food-donat.png" alt="Cookie" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "catFood":
        return <Image src="/assets/icons/foods/food-catfood.png" alt="Cat Food" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "kibble":
        return <Image src="/assets/icons/foods/food-catnip.png" alt="Kibble" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "laser":
        return <Image src="/assets/icons/games/game-laser.png" alt="Laser" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "feather":
        return <Image src="/assets/icons/games/game-feather.png" alt="Feather" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "ball":
        return <Image src="/assets/icons/games/game-ball.png" alt="Ball" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "puzzle":
        return <Image src="/assets/icons/games/game-puzzle.png" alt="Puzzle" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "brush":
        return <Image src="/assets/icons/hygiene/hygiene-comb.png" alt="Brush" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "bath":
        return <Image src="/assets/icons/hygiene/hygiene-bath.png" alt="Bath" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "nails":
        return <Image src="/assets/icons/hygiene/hygiene-nailclipper.png" alt="Nails" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "dental":
        return <Image src="/assets/icons/hygiene/hygiene-tooth.png" alt="Dental" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "checkup":
        return <Image src="/assets/icons/healings/healing.png" alt="Check-up" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "vitamins":
        return <Image src="/assets/icons/healings/healing.png" alt="Vitamins" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "vaccine":
        return <Image src="/assets/icons/healings/healing.png" alt="Vaccine" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "surgery":
        return <Image src="/assets/icons/healings/healing.png" alt="Surgery" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      default:
        return <span className="text-xl">❓</span>;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 flex items-center justify-center rounded-lg ${
          isHighlighted ? "bg-gray-100" : "bg-transparent hover:bg-gray-300 transition-colors"
        }`}
      >
        {getIcon()}
      </div>
    </div>
  );
} 
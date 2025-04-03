import { motion } from "framer-motion"
import Image from "next/image"

const blinkAnimation = {
  open: { d: "M 2 2 Q 3.5 0 5 2" },
  closed: { d: "M 2 2 Q 3.5 4 5 2" },
}

// These animations will be applied to the image container
const pawAnimation = {
  rest: { rotate: 0 },
  wave: { rotate: [0, 5, 0, -5, 0], transition: { duration: 2, repeat: Infinity } },
}

const tailAnimation = {
  rest: { rotate: 0 },
  wag: { rotate: [0, 10, 0, -10, 0], transition: { duration: 2, repeat: Infinity, repeatDelay: 1 } },
}

interface CatEmotionProps {
  eyeExpression?: React.ReactNode;
  selectedMenuItem?: number | null;
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
}

// Modified CatBase to use an image instead of text characters
const CatBase: React.FC<CatEmotionProps> = ({ eyeExpression, selectedMenuItem, hygieneTaskOnCooldown, foodTaskOnCooldown }) => (
  <div className="relative flex justify-center items-center">
    {/* Shadow image */}
    <Image 
      src="/assets/character/shadow.png" 
      alt="Shadow"
      width={120} 
      height={32}
      unoptimized={true}
      className="absolute top-[120px] object-contain opacity-50"
      style={{
        imageRendering: 'pixelated'
      }}
    />
    
    {/* Character image */}
    <Image 
      src={
        foodTaskOnCooldown 
          ? "/assets/character/food.webp" 
          : hygieneTaskOnCooldown 
            ? "/assets/character/bath.webp" 
            : "/assets/character/idle.webp"
      }
      alt="Pet character" 
      width={
        foodTaskOnCooldown 
          ? 140 
          : hygieneTaskOnCooldown 
            ? 120 
            : 200
      } 
      height={
        foodTaskOnCooldown 
          ? 140 
          : hygieneTaskOnCooldown 
            ? 120 
            : 200
      }
      unoptimized={true}
      className="object-contain relative"
      style={{
        imageRendering: 'pixelated'
      }}
    />
    
    {/* Keep animations by applying them to the image container */}
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 transform"
      initial="rest"
      animate="wave"
      variants={pawAnimation}
      style={{ display: 'inline-block', transformOrigin: 'bottom center' }}
    />
    
    <motion.div
      className="absolute bottom-0 right-0"
      initial="rest"
      animate="wag"
      variants={tailAnimation}
      style={{ display: 'inline-block', transformOrigin: 'bottom left' }}
    />
  </div>
)

// Keep the original eyes for reference but they won't be visible with the image
const BlinkingEyes = () => (
  <></>
)

export const HappyCat = ({ hygieneTaskOnCooldown, foodTaskOnCooldown }: { hygieneTaskOnCooldown?: boolean, foodTaskOnCooldown?: boolean }) => 
  <CatBase hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} />

interface AlertCatProps {
  selectedMenuItem?: number | null;
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
}

// Pass the selectedMenuItem, hygieneTaskOnCooldown, and foodTaskOnCooldown to CatBase
export const AlertCat: React.FC<AlertCatProps> = ({ selectedMenuItem, hygieneTaskOnCooldown, foodTaskOnCooldown }) => {
  return <CatBase selectedMenuItem={selectedMenuItem} hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} />;
};

export const SadCat = ({ hygieneTaskOnCooldown, foodTaskOnCooldown }: { hygieneTaskOnCooldown?: boolean, foodTaskOnCooldown?: boolean }) => 
  <CatBase hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} />

export const TiredCat = ({ hygieneTaskOnCooldown, foodTaskOnCooldown }: { hygieneTaskOnCooldown?: boolean, foodTaskOnCooldown?: boolean }) => 
  <CatBase hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} />

export const HungryCat = ({ hygieneTaskOnCooldown, foodTaskOnCooldown }: { hygieneTaskOnCooldown?: boolean, foodTaskOnCooldown?: boolean }) => 
  <CatBase hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} />

export function DeadCat() {
  return (
    <div className="relative opacity-70">
      {/* Shadow image */}
      <Image 
        src="/assets/character/shadow.png" 
        alt="Shadow"
        width={120} 
        height={32}
        unoptimized={true}
        className="absolute top-[120px] object-contain opacity-50"
        style={{
          imageRendering: 'pixelated'
        }}
      />
      
      {/* Character image */}
      <Image 
        src="/assets/character/idle.webp" 
        alt="Dead pet character" 
        width={200} 
        height={200}
        unoptimized={true}
        className="object-contain relative grayscale"
        style={{
          imageRendering: 'pixelated'
        }}
      />
      
      {/* X eyes for dead state */}
      <div className="absolute top-1/3 left-0 right-0 flex justify-center">
        <span className="text-2xl font-bold text-gray-800">✗_✗</span>
      </div>
    </div>
  )
}


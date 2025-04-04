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
  sickStatus?: boolean;
  mostRecentTask?: string | null;
}

// Modified CatBase to use an image instead of text characters
const CatBase: React.FC<CatEmotionProps> = ({ eyeExpression, selectedMenuItem, hygieneTaskOnCooldown, foodTaskOnCooldown, sickStatus, mostRecentTask }) => (
  <div className="relative flex justify-center items-center">
    {/* Shadow image */}
    <Image 
      src="/assets/character/shadow.png" 
      alt="Shadow"
      width={120} 
      height={32}
      unoptimized={true}
      className={`absolute ${(mostRecentTask === 'clean' || hygieneTaskOnCooldown) ? 'top-[100px]' : 'top-[120px]'} object-contain opacity-50`}
      style={{
        imageRendering: 'pixelated'
      }}
    />
    
    {/* Character image */}
    <Image 
      src={
        sickStatus
          ? "/assets/character/sick.webp"
          : mostRecentTask === 'feed' 
            ? "/assets/character/food.webp"
            : mostRecentTask === 'clean'
              ? "/assets/character/bath.webp"
              : foodTaskOnCooldown && !mostRecentTask
                ? "/assets/character/food.webp" 
                : hygieneTaskOnCooldown && !mostRecentTask
                  ? "/assets/character/bath.webp" 
                  : "/assets/character/idle.webp"
      }
      alt="Pet character" 
      width={
        sickStatus
          ? 120
          : mostRecentTask === 'feed' || (foodTaskOnCooldown && !mostRecentTask)
            ? 140 
            : mostRecentTask === 'clean' || (hygieneTaskOnCooldown && !mostRecentTask)
              ? 120 
              : 190
      } 
      height={
        sickStatus
          ? 120
          : mostRecentTask === 'feed' || (foodTaskOnCooldown && !mostRecentTask)
            ? 140 
            : mostRecentTask === 'clean' || (hygieneTaskOnCooldown && !mostRecentTask)
              ? 120 
              : 190
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

export const HappyCat = ({ hygieneTaskOnCooldown, foodTaskOnCooldown, sickStatus, mostRecentTask }: { hygieneTaskOnCooldown?: boolean, foodTaskOnCooldown?: boolean, sickStatus?: boolean, mostRecentTask?: string | null }) => 
  <CatBase hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} sickStatus={sickStatus} mostRecentTask={mostRecentTask} />

interface AlertCatProps {
  selectedMenuItem?: number | null;
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
  sickStatus?: boolean;
  mostRecentTask?: string | null;
}

// Pass all props to CatBase
export const AlertCat: React.FC<AlertCatProps> = ({ selectedMenuItem, hygieneTaskOnCooldown, foodTaskOnCooldown, sickStatus, mostRecentTask }) => {
  return <CatBase selectedMenuItem={selectedMenuItem} hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} sickStatus={sickStatus} mostRecentTask={mostRecentTask} />;
};

export const SadCat = ({ hygieneTaskOnCooldown, foodTaskOnCooldown, sickStatus, mostRecentTask }: { hygieneTaskOnCooldown?: boolean, foodTaskOnCooldown?: boolean, sickStatus?: boolean, mostRecentTask?: string | null }) => 
  <CatBase hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} sickStatus={sickStatus} mostRecentTask={mostRecentTask} />

export const TiredCat = ({ hygieneTaskOnCooldown, foodTaskOnCooldown, sickStatus, mostRecentTask }: { hygieneTaskOnCooldown?: boolean, foodTaskOnCooldown?: boolean, sickStatus?: boolean, mostRecentTask?: string | null }) => 
  <CatBase hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} sickStatus={sickStatus} mostRecentTask={mostRecentTask} />

export const HungryCat = ({ hygieneTaskOnCooldown, foodTaskOnCooldown, sickStatus, mostRecentTask }: { hygieneTaskOnCooldown?: boolean, foodTaskOnCooldown?: boolean, sickStatus?: boolean, mostRecentTask?: string | null }) => 
  <CatBase hygieneTaskOnCooldown={hygieneTaskOnCooldown} foodTaskOnCooldown={foodTaskOnCooldown} sickStatus={sickStatus} mostRecentTask={mostRecentTask} />

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
        src="/assets/character/Dead.png" 
        alt="Dead pet character" 
        width={190} 
        height={190}
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


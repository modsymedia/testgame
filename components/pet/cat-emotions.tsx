import { motion } from "framer-motion";
import Image from "next/image";

// These animations will be applied to the image container
const pawAnimation = {
  rest: { rotate: 0 },
  wave: {
    rotate: [0, 5, 0, -5, 0],
    transition: { duration: 2, repeat: Infinity },
  },
};

const tailAnimation = {
  rest: { rotate: 0 },
  wag: {
    rotate: [0, 10, 0, -10, 0],
    transition: { duration: 2, repeat: Infinity, repeatDelay: 1 },
  },
};

interface CatEmotionProps {
  selectedMenuItem?: number | null;
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
  playTaskOnCooldown?: boolean;
  healTaskOnCooldown?: boolean;
  sickStatus?: boolean;
  mostRecentTask?: string | null;
}

// Modified CatBase to use an image instead of text characters
const CatBase: React.FC<CatEmotionProps> = ({
  hygieneTaskOnCooldown,
  foodTaskOnCooldown,
  playTaskOnCooldown,
  healTaskOnCooldown,
  sickStatus,
  mostRecentTask,
}) => (
  <div className="relative flex justify-center items-center">
    {/* Shadow image */}
    <Image
      src="/assets/character/shadow.png"
      alt="Shadow"
      width={97}
      height={26}
      unoptimized={true}
      className={`absolute ${
        mostRecentTask === "clean" || hygieneTaskOnCooldown
          ? "top-[76px]"
          : "top-[96px]"
      } object-contain opacity-50`}
      style={{
        imageRendering: "pixelated",
      }}
    />

    {/* Character image */}
    <Image
      src={
        sickStatus
          ? "/assets/character/sick.webp"
          : mostRecentTask === "feed"
          ? "/assets/character/food.webp"
          : mostRecentTask === "clean"
          ? "/assets/character/bath.webp"
          : mostRecentTask === "heal"
          ? "/assets/character/heal.webp"
          : mostRecentTask === "play"
          ? "/assets/character/play.webp"
          : foodTaskOnCooldown && !mostRecentTask
          ? "/assets/character/food.webp"
          : hygieneTaskOnCooldown && !mostRecentTask
          ? "/assets/character/bath.webp"
          : playTaskOnCooldown && !mostRecentTask
          ? "/assets/character/play.webp"
          : healTaskOnCooldown && !mostRecentTask
          ? "/assets/character/heal.webp"
          : "/assets/character/idle.webp"
      }
      alt="Pet character"
      width={
        sickStatus
          ? 97
          : mostRecentTask === "feed" || (foodTaskOnCooldown && !mostRecentTask)
          ? 113
          : mostRecentTask === "clean" ||
            (hygieneTaskOnCooldown && !mostRecentTask)
          ? 97
          : mostRecentTask === "heal"
          ? 113
          : mostRecentTask === "play"
          ? 113
          : 154
      }
      height={
        sickStatus
          ? 97
          : mostRecentTask === "feed" || (foodTaskOnCooldown && !mostRecentTask)
          ? 113
          : mostRecentTask === "clean" ||
            (hygieneTaskOnCooldown && !mostRecentTask)
          ? 97
          : mostRecentTask === "heal"
          ? 113
          : mostRecentTask === "play"
          ? 113
          : 154
      }
      unoptimized={true}
      className="object-contain relative"
      style={{
        imageRendering: "pixelated",
      }}
    />

    {/* Keep animations by applying them to the image container */}
    <motion.div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 transform"
      initial="rest"
      animate="wave"
      variants={pawAnimation}
      style={{ display: "inline-block", transformOrigin: "bottom center" }}
    />

    <motion.div
      className="absolute bottom-0 right-0"
      initial="rest"
      animate="wag"
      variants={tailAnimation}
      style={{ display: "inline-block", transformOrigin: "bottom left" }}
    />
  </div>
);

// Keep the original eyes for reference but they won't be visible with the image

export const HappyCat = ({
  hygieneTaskOnCooldown,
  foodTaskOnCooldown,
  playTaskOnCooldown,
  healTaskOnCooldown,
  sickStatus,
  mostRecentTask,
}: {
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
  playTaskOnCooldown?: boolean;
  healTaskOnCooldown?: boolean;
  sickStatus?: boolean;
  mostRecentTask?: string | null;
}) => (
  <CatBase
    hygieneTaskOnCooldown={hygieneTaskOnCooldown}
    foodTaskOnCooldown={foodTaskOnCooldown}
    playTaskOnCooldown={playTaskOnCooldown}
    healTaskOnCooldown={healTaskOnCooldown}
    sickStatus={sickStatus}
    mostRecentTask={mostRecentTask}
  />
);

interface AlertCatProps {
  selectedMenuItem?: number | null;
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
  playTaskOnCooldown?: boolean;
  healTaskOnCooldown?: boolean;
  sickStatus?: boolean;
  mostRecentTask?: string | null;
}

// Pass all props to CatBase
export const AlertCat: React.FC<AlertCatProps> = ({
  selectedMenuItem,
  hygieneTaskOnCooldown,
  foodTaskOnCooldown,
  playTaskOnCooldown,
  healTaskOnCooldown,
  sickStatus,
  mostRecentTask,
}) => {
  return (
    <CatBase
      selectedMenuItem={selectedMenuItem}
      hygieneTaskOnCooldown={hygieneTaskOnCooldown}
      foodTaskOnCooldown={foodTaskOnCooldown}
      playTaskOnCooldown={playTaskOnCooldown}
      healTaskOnCooldown={healTaskOnCooldown}
      sickStatus={sickStatus}
      mostRecentTask={mostRecentTask}
    />
  );
};

export const SadCat = ({
  hygieneTaskOnCooldown,
  foodTaskOnCooldown,
  playTaskOnCooldown,
  healTaskOnCooldown,
  sickStatus,
  mostRecentTask,
}: {
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
  playTaskOnCooldown?: boolean;
  healTaskOnCooldown?: boolean;
  sickStatus?: boolean;
  mostRecentTask?: string | null;
}) => (
  <CatBase
    hygieneTaskOnCooldown={hygieneTaskOnCooldown}
    foodTaskOnCooldown={foodTaskOnCooldown}
    playTaskOnCooldown={playTaskOnCooldown}
    healTaskOnCooldown={healTaskOnCooldown}
    sickStatus={sickStatus}
    mostRecentTask={mostRecentTask}
  />
);

export const TiredCat = ({
  hygieneTaskOnCooldown,
  foodTaskOnCooldown,
  playTaskOnCooldown,
  healTaskOnCooldown,
  sickStatus,
  mostRecentTask,
}: {
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
  playTaskOnCooldown?: boolean;
  healTaskOnCooldown?: boolean;
  sickStatus?: boolean;
  mostRecentTask?: string | null;
}) => (
  <CatBase
    hygieneTaskOnCooldown={hygieneTaskOnCooldown}
    foodTaskOnCooldown={foodTaskOnCooldown}
    playTaskOnCooldown={playTaskOnCooldown}
    healTaskOnCooldown={healTaskOnCooldown}
    sickStatus={sickStatus}
    mostRecentTask={mostRecentTask}
  />
);

export const HungryCat = ({
  hygieneTaskOnCooldown,
  foodTaskOnCooldown,
  playTaskOnCooldown,
  healTaskOnCooldown,
  sickStatus,
  mostRecentTask,
}: {
  hygieneTaskOnCooldown?: boolean;
  foodTaskOnCooldown?: boolean;
  playTaskOnCooldown?: boolean;
  healTaskOnCooldown?: boolean;
  sickStatus?: boolean;
  mostRecentTask?: string | null;
}) => (
  <CatBase
    hygieneTaskOnCooldown={hygieneTaskOnCooldown}
    foodTaskOnCooldown={foodTaskOnCooldown}
    playTaskOnCooldown={playTaskOnCooldown}
    healTaskOnCooldown={healTaskOnCooldown}
    sickStatus={sickStatus}
    mostRecentTask={mostRecentTask}
  />
);

export function DeadCat() {
  return (
    <div className="relative flex justify-center items-center">
      {/* Shadow image */}
      <Image
        src="/assets/character/shadow.png"
        alt="Shadow"
        width={97}
        height={26}
        unoptimized={true}
        className="absolute top-[96px] object-contain opacity-50"
        style={{
          imageRendering: "pixelated",
        }}
      />

      {/* Character image */}
      <Image
        src="/assets/character/Dead.png"
        alt="Dead pet character"
        width={154}
        height={154}
        unoptimized={true}
        className="object-contain relative grayscale"
        style={{
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

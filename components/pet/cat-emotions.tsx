import Image from "next/image";

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
          : playTaskOnCooldown
          ? "top-[70px]"
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
          : mostRecentTask === "heal" || (healTaskOnCooldown && !mostRecentTask)
          ? 113
          : mostRecentTask === "play" || (playTaskOnCooldown && !mostRecentTask)
          ? 120
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
          : mostRecentTask === "heal" || (healTaskOnCooldown && !mostRecentTask)
          ? 113
          : mostRecentTask === "play" || (playTaskOnCooldown && !mostRecentTask)
          ? 120
          : 154
      }
      unoptimized={true}
      className="object-contain relative"
      style={{
        imageRendering: "pixelated",
      }}
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

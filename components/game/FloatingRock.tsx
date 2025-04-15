import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

// Rock styles remain the same as in the landing page
const rockStyles = {
  mainRock: "bg-mainrock w-[56px] h-[56px] relative pixelated",
  rock1: "bg-rock__1_ w-[5px] h-[6px] absolute -left-1.5 -top-1 pixelated",
  rock2: "bg-rock__2_ w-[7px] h-[9px] absolute left-14 -top-2 pixelated",
  rock3: "bg-rock__3_ w-[6px] h-[7px] absolute left-14 top-8 pixelated",
  rock4: "bg-rock__4_ w-[9px] h-[15px] absolute -left-3 top-6 pixelated",
  rock5: "bg-rock__5_ w-[8px] h-[6px] absolute left-0.5 top-11 pixelated",
};

// Enhanced Animation Configurations with Rotation
const animations = {
  mainRock: {
    y: { duration: 18, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
    x: { duration: 22, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" },
    rotate: { duration: 35, repeat: Infinity, repeatType: "reverse", ease: "linear" } // Very slow rotation
  },
  rock1: {
    y: { duration: 30, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.1 },
    x: { duration: 42, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.6 },
    rotate: { duration: 25, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 } // Faster rotation
  },
  rock2: {
    y: { duration: 35, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 },
    x: { duration: 50, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.9 },
    rotate: { duration: 30, repeat: Infinity, repeatType: "reverse", ease: "linear", delay: 0.5 } 
  },
  rock3: {
    y: { duration: 38, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1.2 },
    x: { duration: 46, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.4 },
    rotate: { duration: 28, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.8 }
  },
  rock4: {
    y: { duration: 42, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.9 },
    x: { duration: 58, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.1 },
    rotate: { duration: 32, repeat: Infinity, repeatType: "reverse", ease: "linear", delay: 1.1 }
  },
  rock5: {
    y: { duration: 36, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.6 },
    x: { duration: 45, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 1.3 },
    rotate: { duration: 26, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.2 }
  }
};

interface FloatingRockProps {
  className?: string;
}

const FloatingRock: React.FC<FloatingRockProps> = ({ className = "" }) => {
  return (
    <div className={`${className}`}>
      {/* Main rock with subtle floating motion */}
      <motion.div 
        className={rockStyles.mainRock}
        animate={{ 
          y: [0, -2, 0, 2, 0], 
          x: [0, -0.5, 0, 0.5, 0],
          rotate: [0, -1.5, 0, 1.5, 0] // Subtle rotation
        }}
        transition={{ 
          y: animations.mainRock.y,
          x: animations.mainRock.x,
          rotate: animations.mainRock.rotate
        }}
      >
        {/* Add the character image */}
        <Image 
          src="/assets/character/idle.webp"
          alt="Character"
          width={42} // Adjust size as needed based on original sprite dimensions
          height={42} // Adjust size as needed
          className="absolute left-1/2 top-[-18px] -translate-x-1/2 pixelated z-10" // Position on top
          style={{ imageRendering: "pixelated" }}
          unoptimized 
        />
        {/* Floating small rocks with more pronounced movement */}
        <motion.div 
          className={rockStyles.rock1}
          animate={{ 
            y: [0, -4, 0, 4, 0], 
            x: [0, -1.5, 0, 1.5, 0],
            rotate: [0, 5, 0, -5, 0] // More rotation
          }}
          transition={{ 
            y: animations.rock1.y,
            x: animations.rock1.x,
            rotate: animations.rock1.rotate
          }}
        />
        <motion.div 
          className={rockStyles.rock2}
          animate={{ 
            y: [0, -3.5, 0, 3.5, 0], 
            x: [0, -1.25, 0, 1.25, 0],
            rotate: [0, -4, 0, 4, 0]
          }}
          transition={{ 
            y: animations.rock2.y,
            x: animations.rock2.x,
            rotate: animations.rock2.rotate
          }}
        />
        <motion.div 
          className={rockStyles.rock3}
          animate={{ 
            y: [0, -3, 0, 3, 0], 
            x: [0, -1, 0, 1, 0],
            rotate: [0, 6, 0, -6, 0]
          }}
          transition={{
            y: animations.rock3.y,
            x: animations.rock3.x,
            rotate: animations.rock3.rotate
          }}
        />
        <motion.div 
          className={rockStyles.rock4}
          animate={{ 
            y: [0, -2.5, 0, 2.5, 0], 
            x: [0, -1, 0, 1, 0],
            rotate: [0, -3, 0, 3, 0]
          }}
          transition={{ 
            y: animations.rock4.y,
            x: animations.rock4.x,
            rotate: animations.rock4.rotate
          }}
        />
        <motion.div 
          className={rockStyles.rock5}
          animate={{ 
            y: [0, -3, 0, 3, 0], 
            x: [0, -1.25, 0, 1.25, 0],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{ 
            y: animations.rock5.y,
            x: animations.rock5.x,
            rotate: animations.rock5.rotate
          }}
        />
      </motion.div>
      
      {/* CSS for sprite sheet */}
      <style jsx global>{`
        .pixelated {
          image-rendering: pixelated;
        }

        .bg-rock__1_ {
          width: 5px;
          height: 6px;
          background: url("/assets/floatingRock.png") -59px -46px;
          background-repeat: no-repeat;
        }

        .bg-rock__2_ {
          width: 7px;
          height: 9px;
          background: url("/assets/floatingRock.png") -59px -18px;
          background-repeat: no-repeat;
        }

        .bg-rock__3_ {
          width: 6px;
          height: 7px;
          background: url("/assets/floatingRock.png") -59px -37px;
          background-repeat: no-repeat;
        }

        .bg-rock__4_ {
          width: 9px;
          height: 15px;
          background: url("/assets/floatingRock.png") -59px -1px;
          background-repeat: no-repeat;
        }

        .bg-rock__5_ {
          width: 8px;
          height: 6px;
          background: url("/assets/floatingRock.png") -59px -29px;
          background-repeat: no-repeat;
        }

        .bg-mainrock {
          width: 56px;
          height: 56px;
          background: url("/assets/floatingRock.png") -1px -1px;
          background-repeat: no-repeat;
        }

        .bg-download {
          width: 5px;
          height: 6px;
          background: url("/assets/floatingRock.png") -1px -59px;
          background-repeat: no-repeat;
        }
      `}</style>
    </div>
  );
};

export default FloatingRock; 
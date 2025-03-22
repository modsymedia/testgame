import { motion } from "framer-motion"

const blinkAnimation = {
  open: { d: "M 2 2 Q 3.5 0 5 2" },
  closed: { d: "M 2 2 Q 3.5 4 5 2" },
}

const pawAnimation = {
  rest: { rotate: 0 },
  wave: { rotate: [0, 5, 0, -5, 0], transition: { duration: 2, repeat: Infinity } },
}

const tailAnimation = {
  rest: { rotate: 0 },
  wag: { rotate: [0, 10, 0, -10, 0], transition: { duration: 2, repeat: Infinity, repeatDelay: 1 } },
}

interface CatEmotionProps {
  eyeExpression: React.ReactNode;
}

const CatBase: React.FC<CatEmotionProps> = ({ eyeExpression }) => (
  <div className="font-mono text-2xl text-[#000000] whitespace-pre relative">
    <div className="flex justify-center items-end mb-0">
      <span className="font-bold text-lg">/\ /\</span>
    </div>
    <div className="flex justify-center items-center h-6">
      <span>(</span>
      {eyeExpression}
      <span>)</span>
    </div>
    <div className="flex justify-center">
      <motion.span
        initial="rest"
        animate="wave"
        variants={pawAnimation}
        style={{ display: 'inline-block', transformOrigin: 'bottom center' }}
      >
        (")
      </motion.span>
      <span> </span>
      <motion.span
        initial="rest"
        animate="wave"
        variants={pawAnimation}
        style={{ display: 'inline-block', transformOrigin: 'bottom center' }}
      >
        (")
      </motion.span>
      <motion.span
        initial="rest"
        animate="wag"
        variants={tailAnimation}
        style={{ display: 'inline-block', transformOrigin: 'bottom left' }}
      >
        /
      </motion.span>
    </div>
  </div>
)

const BlinkingEyes = () => (
  <>
    <motion.svg width="20" height="10" viewBox="0 0 7 4" className="mx-0.5">
      <motion.path
        d={blinkAnimation.open.d || "M 2 2 Q 3.5 0 5 2"}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeLinecap="round"
        animate={{ d: [blinkAnimation.open.d || "M 2 2 Q 3.5 0 5 2", blinkAnimation.closed.d || "M 2 2 Q 3.5 4 5 2", blinkAnimation.open.d || "M 2 2 Q 3.5 0 5 2"] }}
        transition={{ repeat: Infinity, repeatDelay: 2.5, duration: 0.15 }}
      />
    </motion.svg>
    <span>.</span>
    <motion.svg width="20" height="10" viewBox="0 0 7 4" className="mx-0.5">
      <motion.path
        d={blinkAnimation.open.d || "M 2 2 Q 3.5 0 5 2"}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeLinecap="round"
        animate={{ d: [blinkAnimation.open.d || "M 2 2 Q 3.5 0 5 2", blinkAnimation.closed.d || "M 2 2 Q 3.5 4 5 2", blinkAnimation.open.d || "M 2 2 Q 3.5 0 5 2"] }}
        transition={{ repeat: Infinity, repeatDelay: 2.5, duration: 0.15 }}
      />
    </motion.svg>
  </>
)

export const HappyCat = () => <CatBase eyeExpression={<BlinkingEyes />} />

interface AlertCatProps {
  selectedMenuItem: number | null;
}

export const AlertCat: React.FC<AlertCatProps> = ({ selectedMenuItem }) => {
  const getEyeExpression = () => {
    switch (selectedMenuItem) {
      case 0: return <span>^.^</span>; // Excited for food
      case 1: return <span>o.O</span>; // Skeptical/meh for clean
      case 2: return <span>T.T</span>; // Sad for doctor
      case 3: return <span>*.*</span>; // Excited for play (stars in eyes)
      default: return <span>O.O</span>; // Alert when no item is selected
    }
  };

  return <CatBase eyeExpression={getEyeExpression()} />;
};

export const SadCat = () => <CatBase eyeExpression={<span>T.T</span>} />

export const TiredCat = () => <CatBase eyeExpression={<span>-.-</span>} />

export const HungryCat = () => <CatBase eyeExpression={<span>o.o</span>} />

export function DeadCat() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <g>
        {/* Cat body */}
        <ellipse cx="60" cy="70" rx="40" ry="30" fill="#888888" opacity="0.7" />
        
        {/* Cat head */}
        <circle cx="60" cy="40" r="25" fill="#888888" opacity="0.7" />
        
        {/* Cat ears */}
        <polygon points="35,30 45,15 55,30" fill="#888888" opacity="0.7" />
        <polygon points="85,30 75,15 65,30" fill="#888888" opacity="0.7" />
        
        {/* Cat face */}
        <line x1="50" y1="35" x2="43" y2="28" stroke="#333" strokeWidth="2" />
        <line x1="50" y1="28" x2="43" y2="35" stroke="#333" strokeWidth="2" />
        
        <line x1="77" y1="35" x2="70" y2="28" stroke="#333" strokeWidth="2" />
        <line x1="77" y1="28" x2="70" y2="35" stroke="#333" strokeWidth="2" />
        
        <path d="M50,50 Q60,45 70,50" stroke="#333" fill="transparent" strokeWidth="2" />
      </g>
    </svg>
  )
}


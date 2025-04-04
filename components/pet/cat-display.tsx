export function CatDisplay({ mood }: { mood: "happy" | "sad" | "tired" | "hungry" | "normal" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className="w-32 h-32 sm:w-40 sm:h-40"
    >
      {/* Main body - rounded square */}
      <path
        d="M10 25 C10 15, 15 10, 25 10 L75 10 C85 10, 90 15, 90 25 L90 75 C90 85, 85 90, 75 90 L25 90 C15 90, 10 85, 10 75 Z"
        fill="#C5B6E0"
      />
      
      {/* Ears */}
      <path d="M25 10 L35 10 L30 0 Z" fill="#C5B6E0" />
      <path d="M65 10 L75 10 L70 0 Z" fill="#C5B6E0" />
      
      {/* Face - changes based on mood */}
      {mood === "happy" && (
        <>
          <circle cx="35" cy="45" r="3" fill="#333" /> {/* Left eye */}
          <circle cx="65" cy="45" r="3" fill="#333" /> {/* Right eye */}
          <path d="M45 55 Q50 60 55 55" stroke="#333" strokeWidth="2" fill="none" /> {/* Smile */}
        </>
      )}
      {mood === "sad" && (
        <>
          <circle cx="35" cy="45" r="3" fill="#333" />
          <circle cx="65" cy="45" r="3" fill="#333" />
          <path d="M45 60 Q50 55 55 60" stroke="#333" strokeWidth="2" fill="none" />
        </>
      )}
      {mood === "tired" && (
        <>
          <path d="M32 45 L38 45" stroke="#333" strokeWidth="2" /> {/* Left sleepy eye */}
          <path d="M62 45 L68 45" stroke="#333" strokeWidth="2" /> {/* Right sleepy eye */}
          <path d="M45 55 L55 55" stroke="#333" strokeWidth="2" /> {/* Neutral mouth */}
        </>
      )}
      {mood === "hungry" && (
        <>
          <circle cx="35" cy="45" r="3" fill="#333" />
          <circle cx="65" cy="45" r="3" fill="#333" />
          <path d="M45 55 Q50 65 55 55" stroke="#333" strokeWidth="2" fill="none" /> {/* Open mouth */}
        </>
      )}
      {(mood === "normal" || !mood) && (
        <>
          <circle cx="35" cy="45" r="3" fill="#333" />
          <circle cx="65" cy="45" r="3" fill="#333" />
          <path d="M45 55 Q50 58 55 55" stroke="#333" strokeWidth="2" fill="none" />
        </>
      )}
      
      {/* Paws/Arms */}
      <path d="M20 70 Q25 75 30 70" stroke="#C5B6E0" strokeWidth="8" fill="none" />
      <path d="M70 70 Q75 75 80 70" stroke="#C5B6E0" strokeWidth="8" fill="none" />
      
      {/* Tail */}
      <path d="M90 50 Q100 50 100 60" stroke="#C5B6E0" strokeWidth="8" fill="none" />
    </svg>
  )
}


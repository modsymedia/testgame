import React from 'react';
import { cn } from '@/lib/utils'; 

interface PixelatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const PixelatedButton = React.forwardRef<HTMLButtonElement, PixelatedButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative inline-block group">
        {/* Background/Shadow layer */}
        <div className="absolute inset-0 bg-[#304700] top-1 left-1 rounded-md group-active:top-0 group-active:left-0 transition-all duration-100"></div>
        
        {/* Main Button layer */}
        <button
          ref={ref}
          className={cn(
            "relative px-6 py-3 bg-[#CADA9B] text-[#304700] font-bold font-pixelify text-xl border-2 border-[#304700] rounded-md transition-all duration-100",
            "hover:bg-[#b8cf8a] active:top-1 active:left-1", // Hover and Active states
            // Clip-path is generally more reliable for the notch effect
            className 
          )}
          // Use clip-path for the notch
          style={{ clipPath: 'polygon(4px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 4px)' }} 
          {...props}
        >
          {children}
        </button>
      </div>
    );
  }
);

PixelatedButton.displayName = 'PixelatedButton';

// Ensure component is exported correctly
export { PixelatedButton }; 
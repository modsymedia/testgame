import React from 'react';

interface PixelatedContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
}

const PixelatedContainer: React.FC<PixelatedContainerProps> = ({ 
  children, 
  className = '', 
  style = {},
  noPadding = false
}) => {
  return (
    <div 
      className={`relative ${className}`}
      style={{
        ...style,
        backgroundColor: '#EBFFB7',
      }}
    >
      {/* Edge extensions - vertical */}
      <div className="absolute top-0 -left-[6px] w-[6px] h-full bg-[#304700]" />
      <div className="absolute top-0 -right-[6px] w-[6px] h-full bg-[#304700]" />
      
      {/* Edge extensions - horizontal */}    
      <div className="absolute -top-[6px] left-0 w-full h-[6px] bg-[#304700]" />
      <div className="absolute -bottom-[6px] left-0 w-full h-[6px] bg-[#304700]" />
      
      {/* Inner content */}
      <div className={`relative w-full h-full flex items-center justify-center ${noPadding ? '' : 'p-4'}`}>
        {children}
      </div>
    </div>
  );
};

export default PixelatedContainer; 
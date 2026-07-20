import React from 'react';

interface UDLaPovedaLogoProps {
  className?: string;
}

export default function UDLaPovedaLogo({ className = "w-10 h-10" }: UDLaPovedaLogoProps) {
  return (
    <div className={`${className} flex items-center justify-center`} id="ud-la-poveda-svg-crest">
      <svg 
        viewBox="0 0 600 380" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain block"
        style={{ aspectRatio: "600 / 380" }}
      >
        {/* Outer Blue Oval Outline */}
        <ellipse cx="300" cy="190" rx="275" ry="170" stroke="#254194" strokeWidth="12" />
        
        {/* Inner Thick Blue Oval Ring */}
        <ellipse cx="300" cy="190" rx="230" ry="135" stroke="#254194" strokeWidth="24" />
        
        {/* Central Pennant / Banderín pointing right with white border */}
        <path d="M 75,55 L 590,190 L 75,325 Q 120,190 75,55 Z" fill="#ffffff" />
        <path d="M 80,60 L 575,190 L 80,320 Q 122,190 80,60 Z" fill="#254194" />
        
        {/* Inset white block inside the pennant for the U D letters */}
        <rect x="120" y="115" width="65" height="65" fill="#ffffff" />
        <text x="130" y="152" fill="#254194" fontFamily="'Inter', 'Arial Black', sans-serif" fontWeight="900" fontSize="38">U</text>
        <text x="156" y="174" fill="#254194" fontFamily="'Inter', 'Arial Black', sans-serif" fontWeight="900" fontSize="30">D</text>
        
        {/* The text "LA POVEDA" next to it */}
        <text x="205" y="210" fill="#ffffff" fontFamily="'Inter', 'Arial Black', sans-serif" fontWeight="900" fontSize="52" letterSpacing="-0.02em">LA POVEDA</text>
      </svg>
    </div>
  );
}

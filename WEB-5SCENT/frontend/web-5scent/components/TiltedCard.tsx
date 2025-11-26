'use client';

import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import TiltCard from './TiltCard';

interface TiltedCardProps {
  imageSrc: string;
  altText?: string;
  labelText: string;
  containerHeight?: React.CSSProperties['height'];
  containerWidth?: React.CSSProperties['width'];
  rotateAmplitude?: number;
}

export default function TiltedCard({
  imageSrc,
  altText = 'Product image',
  labelText,
  containerHeight = '500px',
  containerWidth = '100%',
  rotateAmplitude = 15
}: TiltedCardProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      style={{
        height: containerHeight,
        width: containerWidth
      }}
    >
      <TiltCard
        rotateAmplitude={rotateAmplitude}
        maxShadow="0 30px 60px rgba(0, 0, 0, 0.4)"
        minShadow="0 10px 25px rgba(0, 0, 0, 0.15)"
        borderRadius="rounded-[28px]"
        className="w-full h-full"
      >
        <div
          className="relative w-full h-full"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Background Image */}
          <Image
            src={imageSrc}
            alt={altText}
            fill
            className="object-cover"
            unoptimized
            priority
          />

          {/* Gradient Overlay for Label Area - Enhanced */}
          <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/60 via-black/30 to-transparent pointer-events-none" />

          {/* 3D Label Pill - Enhanced with stronger depth effect */}
          <motion.div
            className="absolute top-6 left-1/2 px-7 py-3.5 bg-black/75 backdrop-blur-md rounded-full whitespace-nowrap will-change-transform"
            style={{
              transform: 'translateX(-50%)',
              transformStyle: 'preserve-3d',
              zIndex: 20
            }}
            animate={{
              scale: isHovering ? 1.05 : 1,
              boxShadow: isHovering
                ? '0 16px 32px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 0, 0, 0.3)'
                : '0 8px 16px rgba(0, 0, 0, 0.3), 0 0 15px rgba(0, 0, 0, 0.15)',
              y: isHovering ? -2 : 0
            }}
            transition={{
              scale: { duration: 0.3 },
              boxShadow: { duration: 0.3 },
              y: { duration: 0.3 }
            }}
          >
            <span className="text-white font-semibold text-sm md:text-base font-body drop-shadow-lg">
              {labelText}
            </span>
          </motion.div>
        </div>
      </TiltCard>
    </div>
  );
}



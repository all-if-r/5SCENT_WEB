'use client';

import { useRef, useState, ReactNode } from 'react';
import { motion } from 'motion/react';

interface TiltCardProps {
  children: ReactNode;
  rotateAmplitude?: number;
  maxShadow?: string;
  minShadow?: string;
  borderRadius?: string;
  className?: string;
}

export default function TiltCard({
  children,
  rotateAmplitude = 15,
  maxShadow = '0 25px 50px rgba(0, 0, 0, 0.35)',
  minShadow = '0 10px 25px rgba(0, 0, 0, 0.15)',
  borderRadius = 'rounded-[28px]',
  className = ''
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const x = e.clientX - rect.left - centerX;
    const y = e.clientY - rect.top - centerY;

    const rotationY = (x / centerX) * rotateAmplitude;
    const rotationX = -(y / centerY) * rotateAmplitude;

    setRotateX(rotationX);
    setRotateY(rotationY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setIsHovering(false);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  return (
    <div
      style={{
        perspective: '1200px'
      }}
      className={className}
    >
      <motion.div
        ref={cardRef}
        className={`relative w-full h-full overflow-hidden ${borderRadius} bg-white`}
        style={{
          transformStyle: 'preserve-3d'
        }}
        animate={{
          rotateX,
          rotateY,
          boxShadow: isHovering ? maxShadow : minShadow
        }}
        transition={{
          boxShadow: { duration: 0.2 },
          rotateX: { duration: 0.1 },
          rotateY: { duration: 0.1 }
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        {children}
      </motion.div>
    </div>
  );
}
